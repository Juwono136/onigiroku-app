package middleware

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type RateLimitConfig struct {
	Limit   int
	Window  time.Duration
	Prefix  string
	Enabled bool
}

func RateLimit(client *goredis.Client, cfg RateLimitConfig) gin.HandlerFunc {
	if !cfg.Enabled || client == nil {
		return func(c *gin.Context) { c.Next() }
	}
	if cfg.Limit <= 0 {
		cfg.Limit = 100
	}
	if cfg.Window <= 0 {
		cfg.Window = time.Minute
	}
	if cfg.Prefix == "" {
		cfg.Prefix = "rl"
	}

	return func(c *gin.Context) {
		key := fmt.Sprintf("%s:%s", cfg.Prefix, c.ClientIP())
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		count, err := client.Incr(ctx, key).Result()
		if err != nil {
			c.Next()
			return
		}
		if count == 1 {
			_ = client.Expire(ctx, key, cfg.Window).Err()
		}
		if int(count) > cfg.Limit {
			response.AbortWithError(c, apperrors.RateLimited())
			return
		}
		c.Header("X-RateLimit-Limit", strconv.Itoa(cfg.Limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(max(0, cfg.Limit-int(count))))
		c.Next()
	}
}
