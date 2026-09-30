package billing

import (
	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
)

type Handler struct {
	XenditWebhookToken string
}

func NewHandler(webhookToken string) *Handler {
	return &Handler{XenditWebhookToken: webhookToken}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.POST("/billing/checkout", h.Checkout)
	r.POST("/billing/webhooks/xendit", h.XenditWebhook)
}

func (h *Handler) Checkout(c *gin.Context) {
	response.Created(c, gin.H{
		"checkoutUrl": nil,
		"provider":    "xendit",
		"message":     "Checkout stub — integrate Xendit Invoices / Payment Links",
	})
}

func (h *Handler) XenditWebhook(c *gin.Context) {
	// Production: verify X-Callback-Token header against XenditWebhookToken
	response.OK(c, gin.H{
		"received": true,
		"message":  "Xendit webhook stub",
	})
}
