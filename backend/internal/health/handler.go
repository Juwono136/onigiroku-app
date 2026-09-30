package health

import (
	"context"
	"crypto/subtle"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	goredis "github.com/redis/go-redis/v9"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Handler struct {
	Pool             *pgxpool.Pool
	Redis            *goredis.Client
	HealthCheckToken string
	RequireToken     bool
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/health", h.healthTokenMiddleware(), h.Health)
	r.GET("/ready", h.healthTokenMiddleware(), h.Ready)
}

func (h *Handler) healthTokenMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !h.RequireToken {
			c.Next()
			return
		}
		if h.HealthCheckToken == "" || !h.validHealthToken(c) {
			response.AbortWithError(c, apperrors.Unauthorized())
			return
		}
		c.Next()
	}
}

func (h *Handler) validHealthToken(c *gin.Context) bool {
	expected := []byte(h.HealthCheckToken)
	if tok := strings.TrimSpace(c.GetHeader("X-Health-Token")); tok != "" {
		provided := []byte(tok)
		if len(provided) == len(expected) &&
			subtle.ConstantTimeCompare(provided, expected) == 1 {
			return true
		}
	}
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		tok := strings.TrimSpace(auth[7:])
		provided := []byte(tok)
		return len(provided) == len(expected) &&
			subtle.ConstantTimeCompare(provided, expected) == 1
	}
	return false
}

func (h *Handler) Health(c *gin.Context) {
	response.OK(c, gin.H{
		"status": "ok",
		"service": "onigiroku-api",
	})
}

func (h *Handler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	checks := gin.H{}
	allOK := true

	if h.Pool != nil {
		if err := h.Pool.Ping(ctx); err != nil {
			checks["postgres"] = "down"
			allOK = false
		} else {
			checks["postgres"] = "up"
		}
	} else {
		checks["postgres"] = "unknown"
		allOK = false
	}

	if h.Redis != nil {
		if err := h.Redis.Ping(ctx).Err(); err != nil {
			checks["redis"] = "down"
			allOK = false
		} else {
			checks["redis"] = "up"
		}
	} else {
		checks["redis"] = "unknown"
		allOK = false
	}

	data := gin.H{
		"status": map[bool]string{true: "ready", false: "not_ready"}[allOK],
		"checks": checks,
	}

	if !allOK {
		c.JSON(http.StatusServiceUnavailable, response.Envelope{
			Success: false,
			Data:    data,
			Error: &response.Error{
				Code:      string(apperrors.CodeServiceUnavail),
				Message:   "Dependency check failed",
				MessageEN: "Dependency check failed",
				MessageID: "Pemeriksaan ketergantungan gagal",
			},
			Meta: response.Meta{RequestID: c.GetString("request_id")},
		})
		return
	}
	response.OK(c, data)
}
