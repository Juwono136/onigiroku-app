package server

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/config"
	"github.com/onigiroku/onigiroku-app/backend/internal/domain/analytics"
	"github.com/onigiroku/onigiroku-app/backend/internal/domain/assessment"
	"github.com/onigiroku/onigiroku-app/backend/internal/domain/billing"
	"github.com/onigiroku/onigiroku-app/backend/internal/domain/content"
	"github.com/onigiroku/onigiroku-app/backend/internal/domain/media"
	"github.com/onigiroku/onigiroku-app/backend/internal/health"
	"github.com/onigiroku/onigiroku-app/backend/internal/middleware"
)

type Dependencies struct {
	Config *config.Config
	Log    *zap.Logger
	Pool   *pgxpool.Pool
	Redis  *goredis.Client
}

func NewEngine(deps Dependencies) *gin.Engine {
	mode := strings.ToLower(deps.Config.GinMode)
	if deps.Config.IsProd || mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	engine := gin.New()
	engine.MaxMultipartMemory = 8 << 20 // 8 MiB

	engine.Use(middleware.RequestID())
	engine.Use(middleware.Recovery(deps.Log))
	engine.Use(middleware.Logger(deps.Log))
	engine.Use(middleware.SecurityHeaders(deps.Config.IsProd))
	engine.Use(middleware.CORS(deps.Config.CORSOrigins))
	engine.Use(middleware.RateLimit(deps.Redis, middleware.RateLimitConfig{
		Enabled:    true,
		Limit:      deps.Config.RateLimitMax,
		Prefix:     "api",
		FailClosed: deps.Config.IsProd,
	}))

	healthHandler := &health.Handler{
		Pool:             deps.Pool,
		Redis:            deps.Redis,
		HealthCheckToken: deps.Config.HealthCheckToken,
		RequireToken:     deps.Config.IsProd,
	}
	healthHandler.Register(engine)

	v1 := engine.Group("/api/v1")
	v1.Use(middleware.RequireInternalSecret(deps.Config.InternalAPISecret, deps.Config.IsProd))
	content.NewHandler().Register(v1)
	assessment.NewHandler().Register(v1)
	analytics.NewHandler().Register(v1)
	billing.NewHandler(deps.Config.XenditWebhookToken).Register(v1)
	// Browser-facing public URLs go through the Next.js media proxy so nginx
	// basic-auth credentials are never requested from end users.
	mediaPublicBase := strings.TrimRight(deps.Config.AppURL, "/") + "/api/media"
	media.NewHandler(
		deps.Config.StorageEndpoint,
		mediaPublicBase,
		deps.Config.StorageBucket,
		deps.Config.StorageAccessKey,
		deps.Config.StorageSecretKey,
		!deps.Config.IsProd,
	).Register(v1)

	engine.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Route not found",
			},
			"meta": gin.H{"requestId": c.GetString("request_id")},
		})
	})

	return engine
}
