package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func Logger(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		rid, _ := c.Get(RequestIDKey)

		fields := []zap.Field{
			zap.Int("status", status),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", c.ClientIP()),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		}
		if s, ok := rid.(string); ok {
			fields = append(fields, zap.String("request_id", s))
		}

		if len(c.Errors) > 0 {
			fields = append(fields, zap.String("errors", c.Errors.String()))
			log.Warn("request completed with errors", fields...)
			return
		}
		if status >= 500 {
			log.Error("request failed", fields...)
		} else if status >= 400 {
			log.Warn("client error", fields...)
		} else {
			log.Info("request", fields...)
		}
	}
}
