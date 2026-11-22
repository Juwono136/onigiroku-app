package commerce

import (
	"io"
	"os"
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

func NewHandler(pool *pgxpool.Pool, mediaSvc *media.Service, doku *DokuClient, appURL string, log *zap.Logger) *Handler {
	return &Handler{
		Service: NewService(pool, mediaSvc, doku, appURL, log),
		Log:     log,
	}
}

func (h *Handler) RegisterPublic(r gin.IRoutes) {
	r.GET("/classes", h.PublicList)
	r.GET("/classes/:slug", h.PublicGet)
	r.POST("/billing/webhooks/doku", h.DokuWebhook)
}

func (h *Handler) RegisterAdmin(r gin.IRoutes) {
	r.GET("/admin/classes", h.AdminList)
	r.POST("/admin/classes", h.AdminCreate)
	r.GET("/admin/classes/:id", h.AdminGet)
	r.PUT("/admin/classes/:id", h.AdminUpdate)
	r.DELETE("/admin/classes/:id", h.AdminArchive)
	r.POST("/admin/classes/:id/hard-delete", h.AdminHardDelete)
	r.GET("/admin/learning/categories/:id/packages", h.AdminPackagesForCategory)
	r.POST("/admin/billing/simulate-paid", h.AdminSimulatePaid)
}

func (h *Handler) RegisterStudent(r gin.IRoutes) {
	r.POST("/billing/checkout", h.Checkout)
}

func (h *Handler) PublicList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	result, err := h.Service.ListPackages(c.Request.Context(), page, pageSize, c.Query("search"), "PUBLISHED", c.Query("sortBy"), true)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) PublicGet(c *gin.Context) {
	pkg, err := h.Service.GetPackageBySlug(c.Request.Context(), c.Param("slug"), true)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, pkg)
}

func (h *Handler) AdminList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	result, err := h.Service.ListPackages(c.Request.Context(), page, pageSize, c.Query("search"), c.DefaultQuery("status", "ALL"), c.Query("sortBy"), false)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) AdminGet(c *gin.Context) {
	pkg, err := h.Service.GetPackageByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, pkg)
}

func (h *Handler) AdminCreate(c *gin.Context) {
	var in PackageUpsertInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.AbortWithError(c, apperrors.Validation("Invalid body", "Body tidak valid"))
		return
	}
	pkg, err := h.Service.CreatePackage(c.Request.Context(), in)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.Created(c, pkg)
}

func (h *Handler) AdminUpdate(c *gin.Context) {
	var in PackageUpsertInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.AbortWithError(c, apperrors.Validation("Invalid body", "Body tidak valid"))
		return
	}
	pkg, err := h.Service.UpdatePackage(c.Request.Context(), c.Param("id"), in)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, pkg)
}

func (h *Handler) AdminArchive(c *gin.Context) {
	if err := h.Service.ArchivePackage(c.Request.Context(), c.Param("id")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"archived": true})
}

func (h *Handler) AdminHardDelete(c *gin.Context) {
	if err := h.Service.HardDeletePackage(c.Request.Context(), c.Param("id")); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true})
}

func (h *Handler) AdminPackagesForCategory(c *gin.Context) {
	items, err := h.Service.PackagesForCategory(c.Request.Context(), c.Param("id"))
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"items": items})
}

func (h *Handler) AdminSimulatePaid(c *gin.Context) {
	if !paymentSimulationAllowed() {
		response.AbortWithError(c, apperrors.Forbidden())
		return
	}
	var body struct {
		InvoiceOrOrderID string `json:"invoiceOrOrderId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.InvoiceOrOrderID) == "" {
		response.AbortWithError(c, apperrors.Validation("invoiceOrOrderId is required", "invoiceOrOrderId wajib"))
		return
	}
	if err := h.Service.SimulatePaid(c.Request.Context(), body.InvoiceOrOrderID); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"simulated": true})
}

func paymentSimulationAllowed() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("ALLOW_PAYMENT_SIMULATION")))
	if v != "1" && v != "true" && v != "yes" {
		return false
	}
	env := strings.ToLower(strings.TrimSpace(os.Getenv("NODE_ENV")))
	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if env == "production" || appEnv == "production" {
		return false
	}
	return true
}

func (h *Handler) Checkout(c *gin.Context) {
	var in CheckoutRequest
	if err := c.ShouldBindJSON(&in); err != nil || strings.TrimSpace(in.PackageSlug) == "" {
		response.AbortWithError(c, apperrors.Validation("packageSlug is required", "packageSlug wajib"))
		return
	}
	userID := middleware.ActorUserID(c)
	name := strings.TrimSpace(c.GetHeader("X-Actor-Name"))
	email := strings.TrimSpace(c.GetHeader("X-Actor-Email"))
	result, err := h.Service.CreateCheckout(c.Request.Context(), userID, name, email, in.PackageSlug)
	if err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.Created(c, result)
}

func (h *Handler) DokuWebhook(c *gin.Context) {
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		response.AbortWithError(c, apperrors.Validation("Invalid body", "Body tidak valid"))
		return
	}
	requestID := c.GetHeader("Request-Id")
	timestamp := c.GetHeader("Request-Timestamp")
	signature := c.GetHeader("Signature")
	// Official DOKU non-SNAP notifications sign Request-Target as the merchant path.
	requestTarget := c.Request.URL.Path
	if err := h.Service.HandleDokuNotification(c.Request.Context(), requestID, timestamp, signature, requestTarget, body); err != nil {
		response.AbortWithError(c, err)
		return
	}
	response.OK(c, gin.H{"received": true})
}
