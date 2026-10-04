package adminusers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/domain/media"
	"github.com/onigiroku/onigiroku-app/backend/internal/middleware"
	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Handler struct {
	Service *Service
}

func NewHandler(pool *pgxpool.Pool, mediaSvc *media.Service, log *zap.Logger) *Handler {
	return &Handler{Service: NewService(pool, mediaSvc, log)}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/admin/users", h.List)
	r.GET("/admin/users/:userId", h.Get)
	r.PATCH("/admin/users/:userId", h.Update)
	r.DELETE("/admin/users/:userId", h.SoftDelete)
	r.POST("/admin/users/:userId/restore", h.Restore)
	r.POST("/admin/users/:userId/hard-delete", h.HardDelete)
}

func (h *Handler) List(c *gin.Context) {
	q := ListQuery{
		Page:     queryInt(c, "page", 1),
		PageSize: queryInt(c, "pageSize", 10),
		Search:   strings.TrimSpace(c.Query("search")),
		Role:     strings.TrimSpace(c.Query("role")),
		Status:   strings.TrimSpace(c.Query("status")),
		Scope:    ListScope(strings.TrimSpace(c.DefaultQuery("scope", "active"))),
		SortBy:   strings.TrimSpace(c.DefaultQuery("sortBy", "createdAt")),
		SortDir:  strings.TrimSpace(c.DefaultQuery("sortDir", "desc")),
	}

	if q.Scope != ScopeActive && q.Scope != ScopeTrash {
		response.AbortWithError(c, apperrors.Validation("Invalid scope", "Scope tidak valid"))
		return
	}

	result, err := h.Service.List(c.Request.Context(), q)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) Get(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("userId"))
	if userID == "" {
		response.AbortWithError(c, apperrors.BadRequest("userId is required", "userId wajib diisi"))
		return
	}
	detail, err := h.Service.Get(c.Request.Context(), userID)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) Update(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("userId"))
	actorID := middleware.ActorUserID(c)
	if userID == "" {
		response.AbortWithError(c, apperrors.BadRequest("userId is required", "userId wajib diisi"))
		return
	}

	var patch UpdatePatch
	if err := c.ShouldBindJSON(&patch); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid JSON body", "Body JSON tidak valid"))
		return
	}
	if patch.Role == nil && patch.Status == nil {
		response.AbortWithError(c, apperrors.Validation(
			"At least one of role or status is required",
			"Minimal salah satu dari role atau status wajib diisi",
		))
		return
	}

	detail, err := h.Service.Update(c.Request.Context(), userID, actorID, patch)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) SoftDelete(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("userId"))
	actorID := middleware.ActorUserID(c)
	detail, err := h.Service.SoftDelete(c.Request.Context(), userID, actorID)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) Restore(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("userId"))
	actorID := middleware.ActorUserID(c)
	detail, err := h.Service.Restore(c.Request.Context(), userID, actorID)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) HardDelete(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("userId"))
	actorID := middleware.ActorUserID(c)
	if err := h.Service.HardDelete(c.Request.Context(), userID, actorID, true); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"id": userID})
}

func queryInt(c *gin.Context, key string, fallback int) int {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}
