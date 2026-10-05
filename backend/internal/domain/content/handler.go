package content

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
	Log     *zap.Logger
}

func NewHandler(pool *pgxpool.Pool, mediaSvc *media.Service, log *zap.Logger) *Handler {
	return &Handler{
		Service: NewService(pool, mediaSvc, log),
		Log:     log,
	}
}

// RegisterPublic mounts catalog stub + public news reads (still behind internal secret on /api).
func (h *Handler) RegisterPublic(r gin.IRoutes) {
	r.GET("/catalog", h.ListCatalog)
	r.GET("/news", h.ListNews)
	r.GET("/news/featured", h.FeaturedNews)
	r.GET("/news/tags", h.ListNewsTags)
	r.GET("/news/:slug", h.GetNews)
}

// RegisterAdmin mounts admin CMS routes (RequireAdminActor already applied).
func (h *Handler) RegisterAdmin(r gin.IRoutes) {
	r.GET("/admin/materials", h.AdminList)
	r.GET("/admin/materials/tags", h.SuggestTags)
	r.DELETE("/admin/materials/tags/:tagId", h.DeleteTag)
	r.POST("/admin/materials", h.AdminCreate)
	r.GET("/admin/materials/:id", h.AdminGet)
	r.PUT("/admin/materials/:id", h.AdminUpdate)
	r.PATCH("/admin/materials/:id", h.AdminUpdate)
	r.DELETE("/admin/materials/:id", h.AdminSoftDelete)
	r.POST("/admin/materials/:id/hard-delete", h.AdminHardDelete)
}

// RegisterStudent mounts student materials routes (RequireActor already applied).
func (h *Handler) RegisterStudent(r gin.IRoutes) {
	r.GET("/materials", h.StudentList)
	r.GET("/materials/:slug", h.StudentGet)
}

func (h *Handler) ListCatalog(c *gin.Context) {
	response.OK(c, gin.H{
		"items":   []any{},
		"message": "Catalog stub — connect to content service",
	})
}

func (h *Handler) AdminList(c *gin.Context) {
	q := parseListQuery(c)
	result, err := h.Service.List(c.Request.Context(), q)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) AdminGet(c *gin.Context) {
	detail, err := h.Service.GetByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) AdminCreate(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	var in UpsertInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	detail, err := h.Service.Create(c.Request.Context(), actor, in)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.Created(c, detail)
}

func (h *Handler) AdminUpdate(c *gin.Context) {
	var in UpsertInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	detail, err := h.Service.Update(c.Request.Context(), c.Param("id"), in)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) AdminSoftDelete(c *gin.Context) {
	if err := h.Service.SoftDelete(c.Request.Context(), c.Param("id")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true, "id": c.Param("id")})
}

func (h *Handler) AdminHardDelete(c *gin.Context) {
	if err := h.Service.HardDelete(c.Request.Context(), c.Param("id")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true, "id": c.Param("id")})
}

func (h *Handler) SuggestTags(c *gin.Context) {
	limit := 30
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil {
			limit = n
		}
	}
	items, err := h.Service.SuggestTags(c.Request.Context(), c.Query("q"), limit)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"items": items})
}

func (h *Handler) DeleteTag(c *gin.Context) {
	if err := h.Service.DeleteTag(c.Request.Context(), c.Param("tagId")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true, "id": c.Param("tagId")})
}

func (h *Handler) ListNews(c *gin.Context) {
	q := parseListQuery(c)
	q.RequirePublicPublished = true
	q.Visibility = "PUBLIC"
	q.Status = "PUBLISHED"
	result, err := h.Service.List(c.Request.Context(), q)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) FeaturedNews(c *gin.Context) {
	locale := c.DefaultQuery("locale", "id")
	items, err := h.Service.LandingFeatured(c.Request.Context(), locale, 5)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"items": items})
}

func (h *Handler) ListNewsTags(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "40"))
	items, err := h.Service.ListPublicTags(c.Request.Context(), limit)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"items": items})
}

func (h *Handler) GetNews(c *gin.Context) {
	detail, err := h.Service.GetBySlug(c.Request.Context(), c.Param("slug"), true, false)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) StudentList(c *gin.Context) {
	q := parseListQuery(c)
	q.RequireStudentPublished = true
	q.Visibility = "STUDENT"
	q.Status = "PUBLISHED"
	result, err := h.Service.List(c.Request.Context(), q)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) StudentGet(c *gin.Context) {
	detail, err := h.Service.GetBySlug(c.Request.Context(), c.Param("slug"), false, true)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func parseListQuery(c *gin.Context) ListQuery {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	var featured *bool
	if raw := c.Query("featured"); raw != "" {
		v := strings.EqualFold(raw, "true") || raw == "1"
		featured = &v
	}
	return ListQuery{
		Page:       page,
		PageSize:   pageSize,
		Search:     c.Query("search"),
		Visibility: c.DefaultQuery("visibility", "ALL"),
		Status:     c.DefaultQuery("status", "ALL"),
		TagSlug:    c.Query("tag"),
		TagSlugs:   parseTagQueryParams(c),
		Featured:   featured,
		Locale:     c.DefaultQuery("locale", "id"),
		SortBy:     c.DefaultQuery("sortBy", "publishedAt"),
		SortDir:    c.DefaultQuery("sortDir", "desc"),
	}
}

// parseTagQueryParams accepts ?tags=a,b and repeated ?tag=a&tag=b (plus legacy single tag).
func parseTagQueryParams(c *gin.Context) []string {
	raw := make([]string, 0, 8)
	if joined := strings.TrimSpace(c.Query("tags")); joined != "" {
		for _, part := range strings.Split(joined, ",") {
			raw = append(raw, part)
		}
	}
	raw = append(raw, c.QueryArray("tag")...)
	return normalizeTagSlugList(raw, "")
}
