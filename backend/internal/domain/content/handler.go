package content

import (
	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/catalog", h.ListCatalog)
	r.GET("/materials", h.ListMaterials)
}

func (h *Handler) ListCatalog(c *gin.Context) {
	response.OK(c, gin.H{
		"items":   []any{},
		"message": "Catalog stub — connect to content service",
	})
}

func (h *Handler) ListMaterials(c *gin.Context) {
	response.OK(c, gin.H{
		"items":   []any{},
		"message": "Materials stub — connect to content service",
	})
}
