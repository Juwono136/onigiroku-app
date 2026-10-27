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
	r.GET("/admin/learning/categories", h.AdminListCategories)
	r.POST("/admin/learning/categories", h.AdminCreateCategory)
	r.GET("/admin/learning/categories/:id", h.AdminGetCategory)
	r.PUT("/admin/learning/categories/:id", h.AdminUpdateCategory)
	r.DELETE("/admin/learning/categories/:id", h.AdminArchiveCategory)
	r.POST("/admin/learning/categories/:id/hard-delete", h.AdminHardDeleteCategory)
	r.PUT("/admin/learning/categories/:id/lessons/order", h.AdminReorderLessons)
	r.POST("/admin/learning/categories/:id/lessons/bulk-delete", h.AdminBulkDeleteLessons)
}

// RegisterStudent mounts student materials routes (RequireActor already applied).
func (h *Handler) RegisterStudent(r gin.IRoutes) {
	r.GET("/learning/categories", h.StudentListCategories)
	r.GET("/learning/categories/tags", h.StudentListCategoryTags)
	r.GET("/learning/categories/:slug", h.StudentGetCategory)
	r.GET("/materials", h.StudentList)
	r.POST("/materials/:slug/progress", h.StudentProgress)
	r.GET("/materials/:slug/quiz/attempts/:attemptId", h.StudentQuizAttemptDetail)
	r.GET("/materials/:slug/quiz/attempts", h.StudentQuizAttempts)
	r.POST("/materials/:slug/quiz", h.StudentQuiz)
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
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	role, _ := c.Get(middleware.ContextActorRole)
	roleStr, _ := role.(string)
	view, err := h.Service.OpenStudentLesson(c.Request.Context(), actor, c.Param("slug"), c.DefaultQuery("locale", "id"), roleStr == "ADMIN")
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, view)
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
		CategoryID: c.Query("categoryId"),
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

func (h *Handler) AdminListCategories(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	result, err := h.Service.ListCategories(
		c.Request.Context(),
		page,
		pageSize,
		c.Query("search"),
		c.Query("status"),
		c.DefaultQuery("sortBy", "position"),
		c.DefaultQuery("sortDir", "asc"),
		true,
		parseTagQueryParams(c),
	)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) AdminCreateCategory(c *gin.Context) {
	var in CategoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	item, err := h.Service.CreateCategory(c.Request.Context(), in)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.Created(c, item)
}

func (h *Handler) AdminGetCategory(c *gin.Context) {
	item, err := h.Service.GetCategory(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, item)
}

func (h *Handler) AdminUpdateCategory(c *gin.Context) {
	var in CategoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	item, err := h.Service.UpdateCategory(c.Request.Context(), c.Param("id"), in)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, item)
}

func (h *Handler) AdminArchiveCategory(c *gin.Context) {
	if err := h.Service.ArchiveCategory(c.Request.Context(), c.Param("id")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"archived": true, "id": c.Param("id")})
}

func (h *Handler) AdminHardDeleteCategory(c *gin.Context) {
	if err := h.Service.HardDeleteCategory(c.Request.Context(), c.Param("id")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true, "id": c.Param("id")})
}

func (h *Handler) AdminReorderLessons(c *gin.Context) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	if err := h.Service.ReorderLessons(c.Request.Context(), c.Param("id"), body.IDs); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"ok": true})
}

func (h *Handler) AdminBulkDeleteLessons(c *gin.Context) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	deleted, err := h.Service.BulkHardDeleteLessons(c.Request.Context(), c.Param("id"), body.IDs)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": deleted, "ids": body.IDs})
}

func (h *Handler) StudentListCategories(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	result, err := h.Service.StudentCategories(
		c.Request.Context(),
		actor,
		page,
		pageSize,
		c.Query("search"),
		c.DefaultQuery("sortBy", "position"),
		c.DefaultQuery("sortDir", "asc"),
		parseTagQueryParams(c),
	)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) StudentListCategoryTags(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "40"))
	tags, err := h.Service.ListStudentCategoryTags(c.Request.Context(), limit)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, tags)
}

func (h *Handler) StudentGetCategory(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	detail, err := h.Service.StudentCategoryPath(c.Request.Context(), actor, c.Param("slug"), c.DefaultQuery("locale", "id"))
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, detail)
}

func (h *Handler) StudentProgress(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	var body struct {
		ReadingPercent int `json:"readingPercent"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	progress, err := h.Service.TouchProgress(c.Request.Context(), actor, c.Param("slug"), body.ReadingPercent)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, progress)
}

func (h *Handler) StudentQuizAttempts(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	limit := 50
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil {
			limit = n
		}
	}
	result, err := h.Service.ListQuizAttempts(c.Request.Context(), actor, c.Param("slug"), limit)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) StudentQuizAttemptDetail(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	result, err := h.Service.GetQuizAttempt(
		c.Request.Context(),
		actor,
		c.Param("slug"),
		c.Param("attemptId"),
	)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) StudentQuiz(c *gin.Context) {
	actorID, _ := c.Get(middleware.ContextActorUserID)
	actor, _ := actorID.(string)
	var body QuizSubmitInput
	if err := c.ShouldBindJSON(&body); err != nil {
		response.AbortWithError(c, apperrors.BadRequest("Invalid payload", "Payload tidak valid"))
		return
	}
	result, err := h.Service.SubmitQuiz(c.Request.Context(), actor, c.Param("slug"), body)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}
