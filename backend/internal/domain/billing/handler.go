package billing

import (
	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
)

// Handler is the Xendit billing stub.
//
// Not wired to learning materials yet. When paid STUDENT gating ships:
//  1. Implement Checkout → Xendit Invoice / Payment Link
//  2. Verify X-Callback-Token on webhooks and upsert user_entitlement
//  3. Gate student materials via Next assertCanAccessStudentMaterials /
//     a future Go RequireEntitled middleware
// Until then, STUDENT visibility uses role-only access (USER + ADMIN preview).
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
		"message":     "Checkout stub — not wired to learning materials entitlement yet",
	})
}

func (h *Handler) XenditWebhook(c *gin.Context) {
	// Production: verify X-Callback-Token header against XenditWebhookToken,
	// then grant/revoke entitlements. Do not call materials APIs from here yet.
	_ = h.XenditWebhookToken
	response.OK(c, gin.H{
		"received": true,
		"message":  "Xendit webhook stub — entitlements not applied",
	})
}
