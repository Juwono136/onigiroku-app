package middleware

import (
	"context"
	"crypto/subtle"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/onigiroku/onigiroku-app/backend/internal/response"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

const (
	ContextActorUserID = "actor_user_id"
	ContextActorRole   = "actor_role"
)

// RequireInternalSecretAlways requires X-Internal-Secret for every method
// (including GET). Empty secret always rejects (dev and prod).
func RequireInternalSecretAlways(secret string, _ bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if secret == "" {
			response.AbortWithError(c, apperrors.Unauthorized())
			return
		}

		provided := strings.TrimSpace(c.GetHeader("X-Internal-Secret"))
		if provided == "" || len(provided) != len(secret) ||
			subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
			response.AbortWithError(c, apperrors.Unauthorized())
			return
		}
		c.Next()
	}
}

// RequireActor trusts Next.js BFF after session checks.
// Requires X-Actor-User-Id and verifies the user exists, is ACTIVE, and not soft-deleted.
func RequireActor(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		actorID := strings.TrimSpace(c.GetHeader("X-Actor-User-Id"))
		if actorID == "" {
			response.AbortWithError(c, apperrors.Forbidden())
			return
		}
		if err := assertActorActive(c.Request.Context(), pool, actorID, ""); err != nil {
			response.AbortWithError(c, err)
			return
		}
		role := strings.ToUpper(strings.TrimSpace(c.GetHeader("X-Actor-Role")))
		c.Set(ContextActorUserID, actorID)
		if role != "" {
			c.Set(ContextActorRole, role)
		}
		c.Next()
	}
}

// RequireAdminActor requires actor headers and verifies DB role=ADMIN, ACTIVE, not deleted.
func RequireAdminActor(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		actorID := strings.TrimSpace(c.GetHeader("X-Actor-User-Id"))
		headerRole := strings.ToUpper(strings.TrimSpace(c.GetHeader("X-Actor-Role")))
		if actorID == "" || headerRole != "ADMIN" {
			response.AbortWithError(c, apperrors.Forbidden())
			return
		}
		if err := assertActorActive(c.Request.Context(), pool, actorID, "ADMIN"); err != nil {
			response.AbortWithError(c, err)
			return
		}
		c.Set(ContextActorUserID, actorID)
		c.Set(ContextActorRole, "ADMIN")
		c.Next()
	}
}

func assertActorActive(ctx context.Context, pool *pgxpool.Pool, userID, requiredRole string) error {
	if pool == nil {
		return apperrors.ServiceUnavailable(
			"Database unavailable",
			"Database tidak tersedia",
		)
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var role, status string
	var deletedAt *time.Time
	err := pool.QueryRow(ctx, `
		SELECT role::text, status::text, deleted_at
		FROM "user"
		WHERE id = $1
	`, userID).Scan(&role, &status, &deletedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.Forbidden()
		}
		return apperrors.Internal(err)
	}
	if deletedAt != nil || status != "ACTIVE" {
		return apperrors.Forbidden()
	}
	if requiredRole != "" && !strings.EqualFold(role, requiredRole) {
		return apperrors.Forbidden()
	}
	return nil
}

func ActorUserID(c *gin.Context) string {
	if v, ok := c.Get(ContextActorUserID); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
