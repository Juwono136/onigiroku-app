package adminusers

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/domain/media"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Service struct {
	Pool   *pgxpool.Pool
	Media  *media.Service
	Log    *zap.Logger
}

func NewService(pool *pgxpool.Pool, mediaSvc *media.Service, log *zap.Logger) *Service {
	if log == nil {
		log = zap.NewNop()
	}
	return &Service{Pool: pool, Media: mediaSvc, Log: log}
}

func normalizePage(page int) int {
	if page < 1 {
		return 1
	}
	return page
}

func normalizePageSize(size int) int {
	if size < 5 {
		return 5
	}
	if size > 50 {
		return 50
	}
	return size
}

func escapeLike(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(s)
}

func formatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func formatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := formatTime(*t)
	return &s
}

// revokeActiveSessions expires live sessions without deleting rows so
// last-login / login-history remain auditable after inactive / soft-delete.
func revokeActiveSessions(ctx context.Context, tx pgx.Tx, userID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE session
		SET expires_at = LEAST(expires_at, NOW()),
		    updated_at = NOW()
		WHERE user_id = $1
		  AND expires_at > NOW()
	`, userID)
	return err
}

// purgeLockKey is a stable Postgres advisory lock for soft-delete purge.
const purgeLockKey int64 = 7845123901

func (s *Service) PurgeExpired(ctx context.Context) int {
	var locked bool
	if err := s.Pool.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, purgeLockKey).Scan(&locked); err != nil {
		s.Log.Error("purge advisory lock failed", zap.Error(err))
		return 0
	}
	if !locked {
		return 0
	}
	defer func() {
		_, _ = s.Pool.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, purgeLockKey)
	}()

	cutoff := time.Now().UTC().Add(-SoftDeleteRetentionDays * 24 * time.Hour)
	rows, err := s.Pool.Query(ctx, `
		SELECT id FROM "user"
		WHERE deleted_at IS NOT NULL AND deleted_at < $1
		ORDER BY deleted_at ASC
		LIMIT 50
	`, cutoff)
	if err != nil {
		s.Log.Error("purge query failed", zap.Error(err))
		return 0
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}

	purged := 0
	for _, id := range ids {
		if err := s.hardDeleteExpired(ctx, id, cutoff); err != nil {
			s.Log.Error("purge hard delete failed", zap.String("userId", id), zap.Error(err))
			continue
		}
		purged++
	}
	return purged
}

func (s *Service) ensureNotLastActiveAdmin(ctx context.Context, tx pgx.Tx, targetID, currentRole string) error {
	if !strings.EqualFold(currentRole, "ADMIN") {
		return nil
	}
	var others int
	err := tx.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM "user"
		WHERE role = 'ADMIN'
		  AND deleted_at IS NULL
		  AND status = 'ACTIVE'
		  AND id <> $1
	`, targetID).Scan(&others)
	if err != nil {
		return apperrors.Internal(err)
	}
	if others < 1 {
		return apperrors.LastAdmin()
	}
	return nil
}

func (s *Service) List(ctx context.Context, q ListQuery) (*ListResult, error) {
	// Best-effort background purge (single-flight via advisory lock).
	go func() {
		bg, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		s.PurgeExpired(bg)
	}()

	page := normalizePage(q.Page)
	pageSize := normalizePageSize(q.PageSize)
	scope := q.Scope
	if scope == "" {
		scope = ScopeActive
	}
	sortBy := q.SortBy
	if sortBy == "" {
		sortBy = "createdAt"
	}
	sortDir := strings.ToLower(q.SortDir)
	if sortDir != "asc" {
		sortDir = "desc"
	}

	where := []string{}
	args := []any{}
	argN := 1

	if scope == ScopeTrash {
		where = append(where, "u.deleted_at IS NOT NULL")
	} else {
		where = append(where, "u.deleted_at IS NULL")
	}

	if search := strings.TrimSpace(q.Search); search != "" {
		pattern := "%" + escapeLike(search) + "%"
		where = append(where, fmt.Sprintf("(u.name ILIKE $%d ESCAPE '\\' OR u.email ILIKE $%d ESCAPE '\\')", argN, argN))
		args = append(args, pattern)
		argN++
	}

	if role := strings.TrimSpace(q.Role); role != "" && role != "ALL" {
		if role != "USER" && role != "ADMIN" {
			return nil, apperrors.Validation("Invalid role filter", "Filter role tidak valid")
		}
		where = append(where, fmt.Sprintf("u.role = $%d", argN))
		args = append(args, role)
		argN++
	}

	if status := strings.TrimSpace(q.Status); status != "" && status != "ALL" {
		if status != "ACTIVE" && status != "INACTIVE" {
			return nil, apperrors.Validation("Invalid status filter", "Filter status tidak valid")
		}
		where = append(where, fmt.Sprintf("u.status = $%d", argN))
		args = append(args, status)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	countSQL := `SELECT COUNT(*)::int FROM "user" u WHERE ` + whereSQL
	if err := s.Pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, apperrors.Internal(err)
	}

	totalPages := int(math.Max(1, math.Ceil(float64(total)/float64(pageSize))))
	offset := (page - 1) * pageSize

	orderDir := "DESC"
	if sortDir == "asc" {
		orderDir = "ASC"
	}

	orderExpr := "u.created_at"
	switch sortBy {
	case "name":
		orderExpr = "u.name"
	case "email":
		orderExpr = "u.email"
	case "role":
		orderExpr = "u.role"
	case "status":
		orderExpr = "u.status"
	case "createdAt":
		orderExpr = "u.created_at"
	case "lastLoginAt":
		orderExpr = "last_login"
	}

	listSQL := fmt.Sprintf(`
		SELECT u.id, u.name, u.email, u.email_verified, u.image, u.role::text, u.status::text, u.locale,
		       u.created_at, u.updated_at, u.deleted_at, u.deleted_by,
		       COALESCE(
		         u.last_login_at,
		         (SELECT MAX(s.created_at) FROM session s WHERE s.user_id = u.id)
		       ) AS last_login
		FROM "user" u
		WHERE %s
		ORDER BY %s %s NULLS LAST
		LIMIT %d OFFSET %d
	`, whereSQL, orderExpr, orderDir, pageSize, offset)

	rows, err := s.Pool.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()

	type scanned struct {
		row       userRow
		lastLogin *time.Time
	}
	var scannedRows []scanned
	for rows.Next() {
		var item scanned
		if err := rows.Scan(
			&item.row.ID, &item.row.Name, &item.row.Email, &item.row.EmailVerified, &item.row.Image,
			&item.row.Role, &item.row.Status, &item.row.Locale, &item.row.CreatedAt, &item.row.UpdatedAt,
			&item.row.DeletedAt, &item.row.DeletedBy, &item.lastLogin,
		); err != nil {
			return nil, apperrors.Internal(err)
		}
		item.row.LastLoginAt = item.lastLogin
		scannedRows = append(scannedRows, item)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}

	ids := make([]string, 0, len(scannedRows))
	for _, r := range scannedRows {
		ids = append(ids, r.row.ID)
	}
	providers, err := s.loadProvidersMap(ctx, ids)
	if err != nil {
		return nil, err
	}

	items := make([]UserListItem, 0, len(scannedRows))
	for _, r := range scannedRows {
		items = append(items, toListItem(r.row, r.lastLogin, providers[r.row.ID]))
	}

	return &ListResult{
		Items:      items,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func toListItem(r userRow, last *time.Time, providers []string) UserListItem {
	if providers == nil {
		providers = []string{}
	}
	return UserListItem{
		ID:            r.ID,
		Name:          r.Name,
		Email:         r.Email,
		EmailVerified: r.EmailVerified,
		Image:         r.Image,
		Role:          r.Role,
		Status:        UserStatus(r.Status),
		Locale:        r.Locale,
		CreatedAt:     formatTime(r.CreatedAt),
		UpdatedAt:     formatTime(r.UpdatedAt),
		DeletedAt:     formatTimePtr(r.DeletedAt),
		DeletedBy:     r.DeletedBy,
		LastLoginAt:   formatTimePtr(last),
		Providers:     providers,
	}
}

func (s *Service) loadLastLoginMap(ctx context.Context, ids []string) (map[string]*time.Time, error) {
	out := map[string]*time.Time{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT u.id,
		       COALESCE(
		         u.last_login_at,
		         (SELECT MAX(s.created_at) FROM session s WHERE s.user_id = u.id)
		       ) AS last_login
		FROM "user" u
		WHERE u.id = ANY($1)
	`, ids)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var userID string
		var last *time.Time
		if err := rows.Scan(&userID, &last); err != nil {
			return nil, apperrors.Internal(err)
		}
		out[userID] = last
	}
	return out, rows.Err()
}

func (s *Service) loadProvidersMap(ctx context.Context, ids []string) (map[string][]string, error) {
	out := map[string][]string{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT user_id, provider_id
		FROM account
		WHERE user_id = ANY($1)
	`, ids)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var userID, provider string
		if err := rows.Scan(&userID, &provider); err != nil {
			return nil, apperrors.Internal(err)
		}
		out[userID] = append(out[userID], provider)
	}
	return out, rows.Err()
}

func (s *Service) Get(ctx context.Context, userID string) (*UserDetail, error) {
	row, err := s.fetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var sessionCount int
	if err := s.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM session
		WHERE user_id = $1 AND expires_at > NOW()
	`, userID).Scan(&sessionCount); err != nil {
		return nil, apperrors.Internal(err)
	}

	lastLogin, err := s.loadLastLoginMap(ctx, []string{userID})
	if err != nil {
		return nil, err
	}
	providers, err := s.loadProvidersMap(ctx, []string{userID})
	if err != nil {
		return nil, err
	}

	item := toListItem(*row, lastLogin[userID], providers[userID])
	detail := &UserDetail{
		UserListItem: item,
		SessionCount: sessionCount,
	}
	if row.DeletedAt != nil {
		exp := row.DeletedAt.Add(SoftDeleteRetentionDays * 24 * time.Hour)
		detail.TrashExpiresAt = formatTimePtr(&exp)
	}
	return detail, nil
}

func (s *Service) fetchUser(ctx context.Context, userID string) (*userRow, error) {
	var r userRow
	err := s.Pool.QueryRow(ctx, `
		SELECT id, name, email, email_verified, image, role::text, status::text, locale,
		       created_at, updated_at, deleted_at, deleted_by, last_login_at
		FROM "user"
		WHERE id = $1
	`, userID).Scan(
		&r.ID, &r.Name, &r.Email, &r.EmailVerified, &r.Image,
		&r.Role, &r.Status, &r.Locale, &r.CreatedAt, &r.UpdatedAt,
		&r.DeletedAt, &r.DeletedBy, &r.LastLoginAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.UserNotFound()
		}
		return nil, apperrors.Internal(err)
	}
	return &r, nil
}

func (s *Service) Update(ctx context.Context, userID, actorID string, patch UpdatePatch) (*UserDetail, error) {
	if userID == actorID {
		return nil, apperrors.CannotModifySelf()
	}

	existing, err := s.fetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing.DeletedAt != nil {
		return nil, apperrors.UserNotFound()
	}

	nextRole := existing.Role
	if patch.Role != nil {
		role := strings.ToUpper(strings.TrimSpace(*patch.Role))
		if role != "USER" && role != "ADMIN" {
			return nil, apperrors.Validation("Invalid role", "Role tidak valid")
		}
		nextRole = role
	}

	nextStatus := existing.Status
	if patch.Status != nil {
		status := strings.ToUpper(strings.TrimSpace(*patch.Status))
		if status != "ACTIVE" && status != "INACTIVE" {
			return nil, apperrors.Validation("Invalid status", "Status tidak valid")
		}
		nextStatus = status
	}

	demotingAdmin := existing.Role == "ADMIN" && (nextRole != "ADMIN" || nextStatus == "INACTIVE")
	revokeSessions := nextStatus == "INACTIVE" || (existing.Role == "ADMIN" && nextRole != "ADMIN")

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if demotingAdmin {
		if err := s.ensureNotLastActiveAdmin(ctx, tx, userID, existing.Role); err != nil {
			return nil, err
		}
	}

	tag, err := tx.Exec(ctx, `
		UPDATE "user"
		SET role = $2::user_role, status = $3::user_status, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, userID, nextRole, nextStatus)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, apperrors.UserNotFound()
	}

	if revokeSessions {
		if err := revokeActiveSessions(ctx, tx, userID); err != nil {
			return nil, apperrors.Internal(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.Get(ctx, userID)
}

func (s *Service) SoftDelete(ctx context.Context, userID, actorID string) (*UserDetail, error) {
	if userID == actorID {
		return nil, apperrors.CannotModifySelf()
	}

	existing, err := s.fetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing.DeletedAt != nil {
		return nil, apperrors.UserNotFound()
	}

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := s.ensureNotLastActiveAdmin(ctx, tx, userID, existing.Role); err != nil {
		return nil, err
	}

	tag, err := tx.Exec(ctx, `
		UPDATE "user"
		SET status = 'INACTIVE'::user_status,
		    deleted_at = NOW(),
		    deleted_by = $2,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, userID, actorID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, apperrors.UserNotFound()
	}
	if err := revokeActiveSessions(ctx, tx, userID); err != nil {
		return nil, apperrors.Internal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.Get(ctx, userID)
}

func (s *Service) Restore(ctx context.Context, userID, actorID string) (*UserDetail, error) {
	_ = actorID
	cutoff := time.Now().UTC().Add(-SoftDeleteRetentionDays * 24 * time.Hour)

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var deletedAt *time.Time
	err = tx.QueryRow(ctx, `
		SELECT deleted_at FROM "user"
		WHERE id = $1
		FOR UPDATE
	`, userID).Scan(&deletedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.UserNotFound()
		}
		return nil, apperrors.Internal(err)
	}
	if deletedAt == nil {
		return nil, apperrors.UserNotFound()
	}
	// Already past retention — purge owns this row; do not resurrect.
	if deletedAt.Before(cutoff) {
		return nil, apperrors.UserNotFound()
	}

	tag, err := tx.Exec(ctx, `
		UPDATE "user"
		SET status = 'ACTIVE'::user_status,
		    deleted_at = NULL,
		    deleted_by = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NOT NULL AND deleted_at >= $2
	`, userID, cutoff)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, apperrors.UserNotFound()
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.Get(ctx, userID)
}

// HardDelete permanently removes a user. When requireTrash is true (admin UI),
// the user must already be soft-deleted.
func (s *Service) HardDelete(ctx context.Context, userID, actorID string, requireTrash bool) error {
	if actorID != "" && userID == actorID {
		return apperrors.CannotModifySelf()
	}

	existing, err := s.fetchUser(ctx, userID)
	if err != nil {
		return err
	}
	if requireTrash && existing.DeletedAt == nil {
		return apperrors.UserNotInTrash()
	}

	return s.hardDeleteRow(ctx, existing, func(tx pgx.Tx) error {
		if existing.DeletedAt == nil && existing.Role == "ADMIN" {
			return s.ensureNotLastActiveAdmin(ctx, tx, userID, existing.Role)
		}
		return nil
	})
}

// hardDeleteExpired only removes users still soft-deleted past the cutoff (purge-safe).
func (s *Service) hardDeleteExpired(ctx context.Context, userID string, cutoff time.Time) error {
	existing, err := s.fetchUser(ctx, userID)
	if err != nil {
		return err
	}
	if existing.DeletedAt == nil || !existing.DeletedAt.Before(cutoff) {
		return nil // restored or not yet expired — idempotent no-op
	}
	return s.hardDeleteRow(ctx, existing, nil)
}

func (s *Service) hardDeleteRow(ctx context.Context, existing *userRow, beforeDelete func(pgx.Tx) error) error {
	userID := existing.ID
	imageKey := ""
	if existing.Image != nil {
		imageKey = ExtractOwnedObjectKey(*existing.Image)
	}
	email := existing.Email

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if beforeDelete != nil {
		if err := beforeDelete(tx); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM session WHERE user_id = $1`, userID); err != nil {
		return apperrors.Internal(err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM account WHERE user_id = $1`, userID); err != nil {
		return apperrors.Internal(err)
	}
	// Best-effort cleanup of auth auxiliaries (no FK to user).
	_, _ = tx.Exec(ctx, `DELETE FROM verification WHERE identifier = $1`, email)
	_, _ = tx.Exec(ctx, `DELETE FROM auth_lockout WHERE identifier = $1`, strings.ToLower(email))

	tag, err := tx.Exec(ctx, `DELETE FROM "user" WHERE id = $1`, userID)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.UserNotFound()
	}
	if err := tx.Commit(ctx); err != nil {
		return apperrors.Internal(err)
	}

	if imageKey != "" && s.Media != nil {
		if err := s.Media.DeleteObject(imageKey); err != nil {
			s.Log.Warn("hard delete avatar cleanup failed",
				zap.String("userId", userID),
				zap.String("imageKey", imageKey),
				zap.Error(err),
			)
		}
	}
	return nil
}
