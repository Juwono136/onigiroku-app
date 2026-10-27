package content

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/domain/media"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Service struct {
	Pool  *pgxpool.Pool
	Media *media.Service
	Log   *zap.Logger
}

func NewService(pool *pgxpool.Pool, mediaSvc *media.Service, log *zap.Logger) *Service {
	if log == nil {
		log = zap.NewNop()
	}
	return &Service{Pool: pool, Media: mediaSvc, Log: log}
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

func (s *Service) coverURL(key *string) *string {
	if key == nil || strings.TrimSpace(*key) == "" {
		return nil
	}
	url := "/api/media/" + strings.TrimPrefix(*key, "/")
	return &url
}

func (s *Service) List(ctx context.Context, q ListQuery) (*ListResult, error) {
	page := normalizePage(q.Page)
	pageSize := normalizePageSize(q.PageSize)
	locale := q.Locale
	if locale != "en" && locale != "id" {
		locale = "id"
	}

	adminSurface := !q.RequirePublicPublished && !q.RequireStudentPublished
	where := []string{}
	args := []any{}
	argN := 1

	if !adminSurface {
		// Public / student catalogs never expose soft-deleted or non-published rows.
		where = append(where, "m.deleted_at IS NULL")
	} else {
		// Admin: Archive = status ARCHIVED (and legacy soft-delete rows with deleted_at).
		// Hard delete removes the row entirely.
		statusFilter := strings.ToUpper(strings.TrimSpace(q.Status))
		switch statusFilter {
		case "ARCHIVED":
			where = append(where, "(m.status = 'ARCHIVED' OR m.deleted_at IS NOT NULL)")
		case "DRAFT", "PUBLISHED":
			where = append(where, "m.deleted_at IS NULL")
			where = append(where, fmt.Sprintf("m.status = $%d", argN))
			args = append(args, statusFilter)
			argN++
		default:
			// ALL — include archived + legacy soft-deleted
			where = append(where, "TRUE")
		}
	}

	if q.RequirePublicPublished {
		where = append(where, "m.visibility = 'PUBLIC'", "m.status = 'PUBLISHED'")
	}
	if q.RequireStudentPublished {
		where = append(where, "m.visibility = 'STUDENT'", "m.status = 'PUBLISHED'")
	}
	if q.Visibility != "" && q.Visibility != "ALL" {
		where = append(where, fmt.Sprintf("m.visibility = $%d", argN))
		args = append(args, strings.ToUpper(q.Visibility))
		argN++
	}
	if !adminSurface && q.Status != "" && q.Status != "ALL" {
		where = append(where, fmt.Sprintf("m.status = $%d", argN))
		args = append(args, strings.ToUpper(q.Status))
		argN++
	}
	if q.Featured != nil {
		where = append(where, fmt.Sprintf("m.featured = $%d", argN))
		args = append(args, *q.Featured)
		argN++
	}
	if categoryID := strings.TrimSpace(q.CategoryID); categoryID != "" {
		where = append(where, fmt.Sprintf("m.category_id = $%d", argN))
		args = append(args, categoryID)
		argN++
	}
	if search := strings.TrimSpace(q.Search); search != "" {
		where = append(where, fmt.Sprintf(`
			EXISTS (
			  SELECT 1 FROM learning_material_locale lx
			  WHERE lx.material_id = m.id
			    AND (lx.title ILIKE $%d OR lx.excerpt ILIKE $%d OR lx.body_text ILIKE $%d)
			)`, argN, argN, argN))
		args = append(args, "%"+escapeLike(search)+"%")
		argN++
	}
	tagSlugs := normalizeTagSlugList(q.TagSlugs, q.TagSlug)
	if len(tagSlugs) == 1 {
		where = append(where, fmt.Sprintf(`
			EXISTS (
			  SELECT 1 FROM learning_material_tag mt
			  JOIN learning_tag t ON t.id = mt.tag_id
			  WHERE mt.material_id = m.id AND t.slug = $%d
			)`, argN))
		args = append(args, tagSlugs[0])
		argN++
	} else if len(tagSlugs) > 1 {
		// OR match: material has at least one of the selected tags.
		where = append(where, fmt.Sprintf(`
			EXISTS (
			  SELECT 1 FROM learning_material_tag mt
			  JOIN learning_tag t ON t.id = mt.tag_id
			  WHERE mt.material_id = m.id AND t.slug = ANY($%d::text[])
			)`, argN))
		args = append(args, tagSlugs)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")
	countSQL := `SELECT COUNT(*)::int FROM learning_material m WHERE ` + whereSQL
	var total int
	if err := s.Pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, apperrors.Internal(err)
	}

	orderDir := "DESC"
	if strings.EqualFold(q.SortDir, "asc") {
		orderDir = "ASC"
	}
	orderExpr := "m.published_at NULLS LAST, m.created_at"
	switch q.SortBy {
	case "title":
		orderExpr = "COALESCE(loc.title, '')"
	case "createdAt":
		orderExpr = "m.created_at"
	case "updatedAt":
		orderExpr = "m.updated_at"
	case "publishedAt":
		orderExpr = "m.published_at"
	case "position":
		orderExpr = "m.position NULLS LAST, m.created_at"
	}

	offset := (page - 1) * pageSize
	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, locale, pageSize, offset)
	locArg := argN
	limitArg := argN + 1
	offsetArg := argN + 2

	listSQL := fmt.Sprintf(`
		SELECT m.id, m.slug, m.visibility::text, m.status::text, m.featured, m.cover_object_key,
		       m.author_id, m.published_at, m.created_at, m.updated_at,
		       COALESCE(loc.title, loc_fallback.title, '') AS title,
		       COALESCE(loc.excerpt, loc_fallback.excerpt, '') AS excerpt
		FROM learning_material m
		LEFT JOIN learning_material_locale loc
		  ON loc.material_id = m.id AND loc.locale = $%d
		LEFT JOIN learning_material_locale loc_fallback
		  ON loc_fallback.material_id = m.id AND loc_fallback.locale = 'id'
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, locArg, whereSQL, orderExpr, orderDir, limitArg, offsetArg)

	rows, err := s.Pool.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()

	items := make([]MaterialListItem, 0, pageSize)
	ids := make([]string, 0, pageSize)
	for rows.Next() {
		var (
			r     materialRow
			title string
			ex    string
		)
		if err := rows.Scan(
			&r.ID, &r.Slug, &r.Visibility, &r.Status, &r.Featured, &r.CoverObjectKey,
			&r.AuthorID, &r.PublishedAt, &r.CreatedAt, &r.UpdatedAt, &title, &ex,
		); err != nil {
			return nil, apperrors.Internal(err)
		}
		item := MaterialListItem{
			ID:             r.ID,
			Slug:           r.Slug,
			Visibility:     r.Visibility,
			Status:         r.Status,
			Featured:       r.Featured,
			CoverObjectKey: r.CoverObjectKey,
			CoverURL:       s.coverURL(r.CoverObjectKey),
			AuthorID:       r.AuthorID,
			PublishedAt:    formatTimePtr(r.PublishedAt),
			CreatedAt:      formatTime(r.CreatedAt),
			UpdatedAt:      formatTime(r.UpdatedAt),
			Title:          title,
			Excerpt:        ex,
			Tags:           []TagDTO{},
		}
		items = append(items, item)
		ids = append(ids, r.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}

	tagMap, err := s.loadTagsMap(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if tags, ok := tagMap[items[i].ID]; ok {
			items[i].Tags = tags
		}
	}

	totalPages := int(math.Max(1, math.Ceil(float64(total)/float64(pageSize))))
	return &ListResult{
		Items:      items,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func escapeLike(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(s)
}

func (s *Service) loadTagsMap(ctx context.Context, ids []string) (map[string][]TagDTO, error) {
	out := map[string][]TagDTO{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT mt.material_id, t.id, t.slug, t.name_id, t.name_en
		FROM learning_material_tag mt
		JOIN learning_tag t ON t.id = mt.tag_id
		WHERE mt.material_id = ANY($1)
		ORDER BY t.slug
	`, ids)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var mid string
		var t TagDTO
		if err := rows.Scan(&mid, &t.ID, &t.Slug, &t.NameID, &t.NameEN); err != nil {
			return nil, apperrors.Internal(err)
		}
		out[mid] = append(out[mid], t)
	}
	return out, rows.Err()
}

func (s *Service) GetByID(ctx context.Context, id string) (*MaterialDetail, error) {
	detail, err := s.getOne(ctx, `m.id = $1`, id, "")
	if err != nil {
		return nil, err
	}
	questions, err := s.loadQuestions(ctx, id, true)
	if err != nil {
		return nil, err
	}
	detail.Questions = questions
	return detail, nil
}

func (s *Service) GetBySlug(ctx context.Context, slug string, requirePublic, requireStudent bool) (*MaterialDetail, error) {
	where := `m.slug = $1 AND m.deleted_at IS NULL AND m.status = 'PUBLISHED'`
	if requirePublic {
		where += ` AND m.visibility = 'PUBLIC'`
	}
	if requireStudent {
		where += ` AND m.visibility = 'STUDENT'`
	}
	return s.getOne(ctx, where, slug, "")
}

func (s *Service) getOne(ctx context.Context, where string, arg any, _ string) (*MaterialDetail, error) {
	var r materialRow
	err := s.Pool.QueryRow(ctx, `
		SELECT id, slug, visibility::text, status::text, featured, cover_object_key,
		       author_id, published_at, created_at, updated_at, deleted_at,
		       category_id, position, pass_score, shuffle_questions, shuffle_choices
		FROM learning_material m
		WHERE `+where+`
	`, arg).Scan(
		&r.ID, &r.Slug, &r.Visibility, &r.Status, &r.Featured, &r.CoverObjectKey,
		&r.AuthorID, &r.PublishedAt, &r.CreatedAt, &r.UpdatedAt, &r.DeletedAt,
		&r.CategoryID, &r.Position, &r.PassScore, &r.ShuffleQuestions, &r.ShuffleChoices,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("material")
		}
		return nil, apperrors.Internal(err)
	}

	locales, err := s.loadLocales(ctx, r.ID)
	if err != nil {
		return nil, err
	}
	tagMap, err := s.loadTagsMap(ctx, []string{r.ID})
	if err != nil {
		return nil, err
	}
	title, excerpt := "", ""
	for _, loc := range locales {
		if loc.Locale == "id" {
			title, excerpt = loc.Title, loc.Excerpt
			break
		}
	}
	if title == "" && len(locales) > 0 {
		title, excerpt = locales[0].Title, locales[0].Excerpt
	}
	tags := tagMap[r.ID]
	if tags == nil {
		tags = []TagDTO{}
	}
	return &MaterialDetail{
		MaterialListItem: MaterialListItem{
			ID:             r.ID,
			Slug:           r.Slug,
			Visibility:     r.Visibility,
			Status:         r.Status,
			Featured:       r.Featured,
			CoverObjectKey: r.CoverObjectKey,
			CoverURL:       s.coverURL(r.CoverObjectKey),
			AuthorID:       r.AuthorID,
			PublishedAt:    formatTimePtr(r.PublishedAt),
			CreatedAt:      formatTime(r.CreatedAt),
			UpdatedAt:      formatTime(r.UpdatedAt),
			Title:          title,
			Excerpt:        excerpt,
			Tags:           tags,
		},
		Locales:          locales,
		CategoryID:       r.CategoryID,
		Position:         r.Position,
		PassScore:        r.PassScore,
		ShuffleQuestions: r.ShuffleQuestions,
		ShuffleChoices:   r.ShuffleChoices,
	}, nil
}

func (s *Service) loadLocales(ctx context.Context, materialID string) ([]LocaleDTO, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT locale, title, excerpt, body, body_text, seo_title, seo_description
		FROM learning_material_locale
		WHERE material_id = $1
		ORDER BY locale
	`, materialID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := make([]LocaleDTO, 0, 2)
	for rows.Next() {
		var loc LocaleDTO
		var bodyRaw []byte
		if err := rows.Scan(
			&loc.Locale, &loc.Title, &loc.Excerpt, &bodyRaw, &loc.BodyText,
			&loc.SeoTitle, &loc.SeoDescription,
		); err != nil {
			return nil, apperrors.Internal(err)
		}
		var body any
		if err := json.Unmarshal(bodyRaw, &body); err != nil {
			body = map[string]any{"type": "doc", "content": []any{}}
		}
		loc.Body = body
		out = append(out, loc)
	}
	return out, rows.Err()
}

func (s *Service) Create(ctx context.Context, authorID string, in UpsertInput) (*MaterialDetail, error) {
	vis, status, featured, locales, tags, err := normalizeUpsert(in, true)
	if err != nil {
		return nil, err
	}

	slug, err := s.uniqueSlug(ctx, slugifyTitle(preferredSlugTitleFromLocales(locales)), "")
	if err != nil {
		return nil, err
	}

	id := uuid.NewString()
	var publishedAt *time.Time
	if status == StatusPublished {
		now := time.Now().UTC()
		publishedAt = &now
	}
	if vis != VisibilityPublic {
		featured = false
	}

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO learning_material (
		  id, slug, visibility, status, featured, cover_object_key, author_id, published_at, created_at, updated_at
		) VALUES ($1,$2,$3::material_visibility,$4::material_status,$5,$6,$7,$8,NOW(),NOW())
	`, id, slug, vis, status, featured, nullIfEmptyPtr(in.CoverObjectKey), authorID, publishedAt)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	if err := s.replaceLocales(ctx, tx, id, locales); err != nil {
		return nil, err
	}
	if err := s.replaceTags(ctx, tx, id, tags); err != nil {
		return nil, err
	}
	if err := s.applyLessonPath(ctx, tx, id, vis, in); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.GetByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id string, in UpsertInput) (*MaterialDetail, error) {
	existing, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	vis, status, featured, locales, tags, err := normalizeUpsert(in, false)
	if err != nil {
		return nil, err
	}
	if vis == "" {
		vis = Visibility(existing.Visibility)
	}
	if status == "" {
		status = Status(existing.Status)
	}
	if in.Featured == nil {
		featured = existing.Featured
	}
	if vis != VisibilityPublic {
		featured = false
	}

	slug := existing.Slug
	if existing.Status == string(StatusDraft) && status == StatusDraft {
		slug, err = s.uniqueSlug(ctx, slugifyTitle(preferredSlugTitleFromLocales(locales)), id)
		if err != nil {
			return nil, err
		}
	}

	var publishedAt *time.Time
	if existing.PublishedAt != nil {
		if t, e := time.Parse(time.RFC3339Nano, *existing.PublishedAt); e == nil {
			publishedAt = &t
		}
	}
	if status == StatusPublished && publishedAt == nil {
		now := time.Now().UTC()
		publishedAt = &now
	}

	coverKey := existing.CoverObjectKey
	if in.CoverObjectKey != nil {
		coverKey = nullIfEmptyPtr(in.CoverObjectKey)
	}
	prevCover := existing.CoverObjectKey

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tag, err := tx.Exec(ctx, `
		UPDATE learning_material
		SET slug = $2, visibility = $3::material_visibility, status = $4::material_status,
		    featured = $5, cover_object_key = $6, published_at = $7,
		    deleted_at = NULL, updated_at = NOW()
		WHERE id = $1
	`, id, slug, vis, status, featured, coverKey, publishedAt)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, apperrors.NotFound("material")
	}
	if err := s.replaceLocales(ctx, tx, id, locales); err != nil {
		return nil, err
	}
	if err := s.replaceTags(ctx, tx, id, tags); err != nil {
		return nil, err
	}
	if err := s.applyLessonPath(ctx, tx, id, vis, in); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}

	// Idempotent cover cleanup when replaced/cleared.
	if prevCover != nil && (coverKey == nil || *prevCover != *coverKey) && s.Media != nil {
		_ = s.Media.DeleteObject(*prevCover)
	}

	return s.GetByID(ctx, id)
}

func (s *Service) SoftDelete(ctx context.Context, id string) error {
	// Archive for admin (still listable via status=ARCHIVED / ALL). HardDelete removes the row + media.
	tag, err := s.Pool.Exec(ctx, `
		UPDATE learning_material
		SET status = 'ARCHIVED'::material_status,
		    featured = false,
		    deleted_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("material")
	}
	return nil
}

func (s *Service) HardDelete(ctx context.Context, id string) error {
	var cover *string
	err := s.Pool.QueryRow(ctx, `
		SELECT cover_object_key FROM learning_material WHERE id = $1
	`, id).Scan(&cover)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("material")
		}
		return apperrors.Internal(err)
	}
	tag, err := s.Pool.Exec(ctx, `DELETE FROM learning_material WHERE id = $1`, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("material")
	}
	if cover != nil && *cover != "" && s.Media != nil {
		_ = s.Media.DeleteObject(*cover)
	}
	return nil
}

func (s *Service) SuggestTags(ctx context.Context, q string, limit int) ([]TagDTO, error) {
	if limit < 1 || limit > 50 {
		limit = 20
	}
	q = strings.TrimSpace(q)
	rows, err := s.Pool.Query(ctx, `
		SELECT t.id, t.slug, t.name_id, t.name_en,
		       COALESCE((
		         SELECT COUNT(*)::int FROM learning_material_tag mt WHERE mt.tag_id = t.id
		       ), 0) + COALESCE((
		         SELECT COUNT(*)::int FROM learning_category_tag ct WHERE ct.tag_id = t.id
		       ), 0) AS usage_count
		FROM learning_tag t
		WHERE $1 = '' OR t.slug ILIKE $2 OR t.name_id ILIKE $2 OR t.name_en ILIKE $2
		ORDER BY usage_count DESC, t.slug
		LIMIT $3
	`, q, "%"+escapeLike(q)+"%", limit)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := make([]TagDTO, 0, limit)
	for rows.Next() {
		var t TagDTO
		if err := rows.Scan(&t.ID, &t.Slug, &t.NameID, &t.NameEN, &t.UsageCount); err != nil {
			return nil, apperrors.Internal(err)
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// DeleteTag removes an unused catalog tag. Tags still linked to materials or categories are rejected.
func (s *Service) DeleteTag(ctx context.Context, tagID string) error {
	tagID = strings.TrimSpace(tagID)
	if tagID == "" {
		return apperrors.Validation("Tag id required", "ID tag wajib")
	}
	var usage int
	err := s.Pool.QueryRow(ctx, `
		SELECT
		  COALESCE((SELECT COUNT(*)::int FROM learning_material_tag WHERE tag_id = $1), 0) +
		  COALESCE((SELECT COUNT(*)::int FROM learning_category_tag WHERE tag_id = $1), 0)
	`, tagID).Scan(&usage)
	if err != nil {
		return apperrors.Internal(err)
	}
	if usage > 0 {
		return apperrors.Conflict("TAG_IN_USE", "Tag is still used by materials", "Tag masih dipakai materi")
	}
	tag, err := s.Pool.Exec(ctx, `DELETE FROM learning_tag WHERE id = $1`, tagID)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("tag")
	}
	return nil
}

// ListPublicTags returns tags used by published PUBLIC news, for filter chips.
func (s *Service) ListPublicTags(ctx context.Context, limit int) ([]TagDTO, error) {
	if limit < 1 || limit > 80 {
		limit = 40
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT t.id, t.slug, t.name_id, t.name_en, COUNT(*)::int AS usage_count
		FROM learning_tag t
		JOIN learning_material_tag mt ON mt.tag_id = t.id
		JOIN learning_material m ON m.id = mt.material_id
		WHERE m.deleted_at IS NULL
		  AND m.visibility = 'PUBLIC'
		  AND m.status = 'PUBLISHED'
		GROUP BY t.id, t.slug, t.name_id, t.name_en
		ORDER BY usage_count DESC, t.slug ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := make([]TagDTO, 0, limit)
	for rows.Next() {
		var t TagDTO
		if err := rows.Scan(&t.ID, &t.Slug, &t.NameID, &t.NameEN, &t.UsageCount); err != nil {
			return nil, apperrors.Internal(err)
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Service) LandingFeatured(ctx context.Context, locale string, limit int) ([]MaterialListItem, error) {
	if limit < 1 || limit > 5 {
		limit = 5
	}
	if locale != "en" && locale != "id" {
		locale = "id"
	}
	featured := true
	res, err := s.List(ctx, ListQuery{
		Page:                   1,
		PageSize:               limit,
		Locale:                 locale,
		RequirePublicPublished: true,
		Featured:               &featured,
		SortBy:                 "publishedAt",
		SortDir:                "desc",
	})
	if err != nil {
		return nil, err
	}
	items := res.Items
	if len(items) < limit {
		need := limit - len(items)
		exclude := map[string]struct{}{}
		for _, it := range items {
			exclude[it.ID] = struct{}{}
		}
		more, err := s.List(ctx, ListQuery{
			Page:                   1,
			PageSize:               limit,
			Locale:                 locale,
			RequirePublicPublished: true,
			SortBy:                 "publishedAt",
			SortDir:                "desc",
		})
		if err != nil {
			return nil, err
		}
		for _, it := range more.Items {
			if _, ok := exclude[it.ID]; ok {
				continue
			}
			items = append(items, it)
			need--
			if need == 0 {
				break
			}
		}
	}
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (s *Service) uniqueSlug(ctx context.Context, base, excludeID string) (string, error) {
	base = slugifyTitle(base)
	candidate := base
	for i := 0; i < 50; i++ {
		var existing string
		err := s.Pool.QueryRow(ctx, `
			SELECT id FROM learning_material WHERE slug = $1 LIMIT 1
		`, candidate).Scan(&existing)
		if err == pgx.ErrNoRows {
			return candidate, nil
		}
		if err != nil {
			return "", apperrors.Internal(err)
		}
		if excludeID != "" && existing == excludeID {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", base, i+2)
	}
	return fmt.Sprintf("%s-%s", base, uuid.NewString()[:8]), nil
}

func nullIfEmptyPtr(v *string) *string {
	if v == nil {
		return nil
	}
	s := strings.TrimSpace(*v)
	if s == "" {
		return nil
	}
	return &s
}

func normalizeUpsert(in UpsertInput, requireLocales bool) (Visibility, Status, bool, []LocaleInput, []TagInput, error) {
	vis := Visibility(strings.ToUpper(strings.TrimSpace(in.Visibility)))
	if vis == "" {
		vis = VisibilityStudent
	}
	if vis != VisibilityStudent && vis != VisibilityPublic {
		return "", "", false, nil, nil, apperrors.Validation("Invalid visibility", "Visibility tidak valid")
	}
	status := Status(strings.ToUpper(strings.TrimSpace(in.Status)))
	if status == "" {
		status = StatusDraft
	}
	if status != StatusDraft && status != StatusPublished && status != StatusArchived {
		return "", "", false, nil, nil, apperrors.Validation("Invalid status", "Status tidak valid")
	}
	featured := false
	if in.Featured != nil {
		featured = *in.Featured
	}

	locales := make([]LocaleInput, 0, len(in.Locales))
	seen := map[string]struct{}{}
	for _, loc := range in.Locales {
		l := strings.ToLower(strings.TrimSpace(loc.Locale))
		if l != "id" && l != "en" {
			continue
		}
		if _, ok := seen[l]; ok {
			continue
		}
		title := strings.TrimSpace(loc.Title)
		if title == "" {
			continue
		}
		if len(title) > 200 {
			return "", "", false, nil, nil, apperrors.Validation("Title too long", "Judul terlalu panjang")
		}
		excerpt := strings.TrimSpace(loc.Excerpt)
		if len(excerpt) > 500 {
			return "", "", false, nil, nil, apperrors.Validation("Excerpt too long", "Ringkasan terlalu panjang")
		}
		seoTitle := strings.TrimSpace(loc.SeoTitle)
		if len(seoTitle) > 70 {
			return "", "", false, nil, nil, apperrors.Validation("SEO title too long", "Judul SEO terlalu panjang (maks 70)")
		}
		seoDescription := strings.TrimSpace(loc.SeoDescription)
		if len(seoDescription) > 160 {
			return "", "", false, nil, nil, apperrors.Validation("SEO description too long", "Deskripsi SEO terlalu panjang (maks 160)")
		}
		seen[l] = struct{}{}
		locales = append(locales, LocaleInput{
			Locale:         l,
			Title:          title,
			Excerpt:        excerpt,
			Body:           sanitizeBody(loc.Body),
			SeoTitle:       seoTitle,
			SeoDescription: seoDescription,
		})
	}
	if requireLocales && len(locales) == 0 {
		return "", "", false, nil, nil, apperrors.Validation("At least one locale title is required", "Minimal satu judul bahasa wajib diisi")
	}
	if len(locales) == 0 {
		return "", "", false, nil, nil, apperrors.Validation("Locales required", "Konten bahasa wajib diisi")
	}

	if len(in.Tags) > MaxTagsPerMaterial {
		return "", "", false, nil, nil, apperrors.Validation("Maximum 5 tags", "Maksimal 5 tag")
	}
	tags := make([]TagInput, 0, len(in.Tags))
	tagSeen := map[string]struct{}{}
	for _, t := range in.Tags {
		nameID := strings.TrimSpace(t.NameID)
		nameEN := strings.TrimSpace(t.NameEN)
		if nameID == "" && nameEN == "" {
			continue
		}
		if nameID == "" {
			nameID = nameEN
		}
		if nameEN == "" {
			nameEN = nameID
		}
		slug := NormalizeTagSlug(t.Slug)
		if slug == "" {
			slug = NormalizeTagSlug(nameEN)
		}
		if slug == "" {
			slug = NormalizeTagSlug(nameID)
		}
		if slug == "" {
			continue
		}
		if _, ok := tagSeen[slug]; ok {
			continue
		}
		tagSeen[slug] = struct{}{}
		tags = append(tags, TagInput{NameID: nameID, NameEN: nameEN, Slug: slug})
	}
	if len(tags) > MaxTagsPerMaterial {
		return "", "", false, nil, nil, apperrors.Validation("Maximum 5 tags", "Maksimal 5 tag")
	}
	return vis, status, featured, locales, tags, nil
}

func (s *Service) replaceLocales(ctx context.Context, tx pgx.Tx, materialID string, locales []LocaleInput) error {
	if _, err := tx.Exec(ctx, `DELETE FROM learning_material_locale WHERE material_id = $1`, materialID); err != nil {
		return apperrors.Internal(err)
	}
	for _, loc := range locales {
		bodyJSON, err := json.Marshal(loc.Body)
		if err != nil {
			return apperrors.Validation("Invalid body JSON", "Body tidak valid")
		}
		bodyText := extractPlainText(loc.Body)
		excerpt := strings.TrimSpace(loc.Excerpt)
		if excerpt == "" {
			excerpt = truncateExcerpt(bodyText, 200)
		}
		if len(excerpt) > 500 {
			excerpt = truncateExcerpt(excerpt, 500)
		}
		seoTitle := strings.TrimSpace(loc.SeoTitle)
		if len(seoTitle) > 70 {
			seoTitle = truncateExcerpt(seoTitle, 70)
		}
		// Keep empty optional — public meta falls back to title/excerpt at read time.
		seoDescription := strings.TrimSpace(loc.SeoDescription)
		if len(seoDescription) > 160 {
			seoDescription = truncateExcerpt(seoDescription, 160)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO learning_material_locale (
			  material_id, locale, title, excerpt, body, body_text, seo_title, seo_description, updated_at
			) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,NOW())
		`, materialID, loc.Locale, loc.Title, excerpt, bodyJSON, bodyText, seoTitle, seoDescription); err != nil {
			return apperrors.Internal(err)
		}
	}
	return nil
}

func (s *Service) replaceTags(ctx context.Context, tx pgx.Tx, materialID string, tags []TagInput) error {
	if _, err := tx.Exec(ctx, `DELETE FROM learning_material_tag WHERE material_id = $1`, materialID); err != nil {
		return apperrors.Internal(err)
	}
	for _, t := range tags {
		var tagID string
		err := tx.QueryRow(ctx, `SELECT id FROM learning_tag WHERE slug = $1`, t.Slug).Scan(&tagID)
		if err == pgx.ErrNoRows {
			tagID = uuid.NewString()
			if _, err := tx.Exec(ctx, `
				INSERT INTO learning_tag (id, slug, name_id, name_en, created_at)
				VALUES ($1,$2,$3,$4,NOW())
			`, tagID, t.Slug, t.NameID, t.NameEN); err != nil {
				return apperrors.Internal(err)
			}
		} else if err != nil {
			return apperrors.Internal(err)
		} else {
			_, _ = tx.Exec(ctx, `
				UPDATE learning_tag SET name_id = $2, name_en = $3 WHERE id = $1
			`, tagID, t.NameID, t.NameEN)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO learning_material_tag (material_id, tag_id) VALUES ($1,$2)
			ON CONFLICT DO NOTHING
		`, materialID, tagID); err != nil {
			return apperrors.Internal(err)
		}
	}
	return nil
}
