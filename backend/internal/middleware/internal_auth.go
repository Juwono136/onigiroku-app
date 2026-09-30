package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

// RequireInternalSecret protects mutating API routes from untrusted callers.
// GET/HEAD/OPTIONS remain public for catalog-style reads.
// Webhook paths are excluded (they use provider-specific verification).
func RequireInternalSecret(secret string, isProd bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		path := c.Request.URL.Path
		if strings.Contains(path, "/webhooks/") {
			c.Next()
			return
		}

		if secret == "" {
			if isProd {
				response.AbortWithError(c, apperrors.Unauthorized())
				return
			}
			c.Next()
			return
		}

		provided := strings.TrimSpace(c.GetHeader("X-Internal-Secret"))
		if provided == "" ||
			subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
			response.AbortWithError(c, apperrors.Unauthorized())
			return
		}

		c.Next()
	}
}
