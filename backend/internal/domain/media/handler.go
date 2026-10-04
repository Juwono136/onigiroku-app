package media

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Handler struct {
	Service *Service
}

func NewHandler(endpoint, publicBase, bucket, username, password string, allowLocalhost bool) *Handler {
	return &Handler{
		Service: NewService(endpoint, publicBase, bucket, username, password, allowLocalhost),
	}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.POST("/media/presign", h.Presign)
	r.POST("/media/delete", h.Delete)
	r.DELETE("/media/object", h.Delete)
}

func (h *Handler) Presign(c *gin.Context) {
	var req PresignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AbortWithError(c, apperrors.BadRequest(
			"Invalid media presign payload",
			"Payload media presign tidak valid",
		))
		return
	}

	out, err := h.Service.CreatePresign(req)
	if err != nil {
		response.AbortWithError(c, apperrors.Validation(err.Error(), err.Error()))
		return
	}
	response.OK(c, out)
}

func (h *Handler) Delete(c *gin.Context) {
	var req DeleteRequest
	if c.Request.Method == http.MethodDelete {
		req.ObjectKey = strings.TrimSpace(c.Query("objectKey"))
		if req.ObjectKey == "" {
			_ = c.ShouldBindJSON(&req)
		}
	} else if err := c.ShouldBindJSON(&req); err != nil {
		response.AbortWithError(c, apperrors.BadRequest(
			"Invalid media delete payload",
			"Payload hapus media tidak valid",
		))
		return
	}

	req.ObjectKey = strings.TrimSpace(req.ObjectKey)
	if req.ObjectKey == "" {
		response.AbortWithError(c, apperrors.BadRequest(
			"objectKey is required",
			"objectKey wajib diisi",
		))
		return
	}

	if err := h.Service.DeleteObject(req.ObjectKey); err != nil {
		response.AbortWithError(c, apperrors.Validation(err.Error(), err.Error()))
		return
	}

	response.OK(c, gin.H{
		"deleted":   true,
		"objectKey": req.ObjectKey,
	})
}
