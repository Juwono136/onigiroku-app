package middleware

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

func Recovery(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Error("panic recovered",
					zap.Any("panic", r),
					zap.String("path", c.Request.URL.Path),
				)
				response.Fail(c, apperrors.Internal(nil))
				c.Abort()
			}
		}()
		c.Next()
	}
}
