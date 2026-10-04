package settings

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/middleware"
	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Handler struct {
	Pool *pgxpool.Pool
	Log  *zap.Logger
}

func NewHandler(pool *pgxpool.Pool, log *zap.Logger) *Handler {
	if log == nil {
		log = zap.NewNop()
	}
	return &Handler{Pool: pool, Log: log}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/settings/login-history", h.LoginHistory)
}

func (h *Handler) LoginHistory(c *gin.Context) {
	actorID := middleware.ActorUserID(c)
	if actorID == "" {
		response.AbortWithError(c, apperrors.Forbidden())
		return
	}

	page, _ := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page", "1")))
	pageSize, _ := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("pageSize", "10")))
	currentToken := strings.TrimSpace(c.GetHeader("X-Current-Session-Token"))

	result, err := ListLoginHistory(c.Request.Context(), h.Pool, LoginHistoryQuery{
		UserID:              actorID,
		CurrentSessionToken: currentToken,
		Page:                page,
		PageSize:            pageSize,
	})
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}
