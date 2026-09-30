package analytics

import (
	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.GET("/analytics/dashboard", h.Dashboard)
}

func (h *Handler) Dashboard(c *gin.Context) {
	response.OK(c, gin.H{
		"summary": gin.H{
			"studyMinutes": 0,
			"streakDays":   0,
			"accuracy":     nil,
		},
		"message": "Analytics dashboard stub",
	})
}
