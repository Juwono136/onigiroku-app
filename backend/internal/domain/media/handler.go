package media

import (
	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
)

type Handler struct {
	StorageEndpoint string
	StorageBucket   string
}

func NewHandler(endpoint, bucket string) *Handler {
	return &Handler{
		StorageEndpoint: endpoint,
		StorageBucket:   bucket,
	}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.POST("/media/presign", h.Presign)
}

func (h *Handler) Presign(c *gin.Context) {
	response.OK(c, gin.H{
		"uploadUrl": nil,
		"method":    "PUT",
		"bucket":    h.StorageBucket,
		"endpoint":  h.StorageEndpoint,
		"message":   "Presign stub — wire SeaweedFS S3-compatible API",
	})
}
