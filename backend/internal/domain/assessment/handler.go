package assessment

import (
	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/assessments", h.ListAssessments)
	r.POST("/attempts", h.CreateAttempt)
}

func (h *Handler) ListAssessments(c *gin.Context) {
	response.OK(c, gin.H{
		"items":   []any{},
		"message": "Assessments stub",
	})
}

func (h *Handler) CreateAttempt(c *gin.Context) {
	response.Created(c, gin.H{
		"attemptId": nil,
		"status":    "stub",
		"message":   "Attempt recording stub",
	})
}
