package content

import (
	"context"
	"encoding/json"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

func (s *Service) uniqueCategorySlug(ctx context.Context, base, excludeID string) (string, error) {
	base = slugifyTitle(base)
	if base == "material" {
		base = "category"
	}
	candidate := base
	for i := 0; i < 50; i++ {
		var existing string
		err := s.Pool.QueryRow(ctx, `
			SELECT id FROM learning_category WHERE slug = $1 AND deleted_at IS NULL LIMIT 1
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
		candidate = base + "-" + itoa(i+2)
	}
	return base + "-" + uuid.NewString()[:8], nil
}

func itoa(n int) string {
	return strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(
		jsonNumber(n), "+", ""), " ", ""))
}

func jsonNumber(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

func normalizeCategoryTags(raw []TagInput) ([]TagInput, error) {
	if len(raw) > MaxTagsPerMaterial {
		return nil, apperrors.Validation("Maximum 5 tags", "Maksimal 5 tag")
	}
	tags := make([]TagInput, 0, len(raw))
	seen := map[string]struct{}{}
	for _, t := range raw {
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
		if len([]rune(nameID)) > 80 || len([]rune(nameEN)) > 80 {
			return nil, apperrors.Validation("Tag name is too long", "Nama tag terlalu panjang")
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
		if _, ok := seen[slug]; ok {
			continue
		}
		seen[slug] = struct{}{}
		tags = append(tags, TagInput{NameID: nameID, NameEN: nameEN, Slug: slug})
		if len(tags) >= MaxTagsPerMaterial {
			break
		}
	}
	if len(tags) > MaxTagsPerMaterial {
		return nil, apperrors.Validation("Maximum 5 tags", "Maksimal 5 tag")
	}
	return tags, nil
}

func normalizeCategory(in CategoryInput, _ bool) (CategoryInput, error) {
	in.NameID = strings.TrimSpace(in.NameID)
	in.NameEN = strings.TrimSpace(in.NameEN)
	in.DescriptionID = strings.TrimSpace(in.DescriptionID)
	in.DescriptionEN = strings.TrimSpace(in.DescriptionEN)
	in.Status = strings.ToUpper(strings.TrimSpace(in.Status))
	in.PlanKey = strings.TrimSpace(strings.ToLower(in.PlanKey))
	if in.NameID == "" && in.NameEN == "" {
		return in, apperrors.Validation("Category name is required", "Nama kategori wajib diisi")
	}
	if in.NameID == "" {
		in.NameID = in.NameEN
	}
	if in.NameEN == "" {
		in.NameEN = in.NameID
	}
	if len([]rune(in.NameID)) > 120 || len([]rune(in.NameEN)) > 120 {
		return in, apperrors.Validation("Category name is too long", "Nama kategori terlalu panjang")
	}
	descID, err := normalizeRichField(in.DescriptionID, 1000)
	if err != nil {
		return in, err
	}
	descEN, err := normalizeRichField(in.DescriptionEN, 1000)
	if err != nil {
		return in, err
	}
	in.DescriptionID = descID
	in.DescriptionEN = descEN
	if in.Status == "" {
		in.Status = "DRAFT"
	}
	switch in.Status {
	case "DRAFT", "PUBLISHED", "ARCHIVED":
	default:
		return in, apperrors.Validation("Invalid category status", "Status kategori tidak valid")
	}
	if in.PlanKey == "" {
		in.PlanKey = "free"
	}
	if len(in.PlanKey) > 64 || !planKeyOK(in.PlanKey) {
		return in, apperrors.Validation("Invalid plan key", "Kunci paket tidak valid")
	}
	tags, err := normalizeCategoryTags(in.Tags)
	if err != nil {
		return in, err
	}
	in.Tags = tags
	return in, nil
}

func (s *Service) replaceCategoryTags(ctx context.Context, tx pgx.Tx, categoryID string, tags []TagInput) error {
	if _, err := tx.Exec(ctx, `DELETE FROM learning_category_tag WHERE category_id = $1`, categoryID); err != nil {
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
			INSERT INTO learning_category_tag (category_id, tag_id) VALUES ($1,$2)
			ON CONFLICT DO NOTHING
		`, categoryID, tagID); err != nil {
			return apperrors.Internal(err)
		}
	}
	return nil
}

func (s *Service) loadCategoryTagsMap(ctx context.Context, ids []string) (map[string][]TagDTO, error) {
	out := map[string][]TagDTO{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT ct.category_id, t.id, t.slug, t.name_id, t.name_en
		FROM learning_category_tag ct
		JOIN learning_tag t ON t.id = ct.tag_id
		WHERE ct.category_id = ANY($1)
		ORDER BY t.slug
	`, ids)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var categoryID string
		var t TagDTO
		if err := rows.Scan(&categoryID, &t.ID, &t.Slug, &t.NameID, &t.NameEN); err != nil {
			return nil, apperrors.Internal(err)
		}
		out[categoryID] = append(out[categoryID], t)
	}
	return out, rows.Err()
}

func (s *Service) attachCategoryTags(ctx context.Context, items []CategoryDTO) error {
	ids := make([]string, len(items))
	for i := range items {
		ids[i] = items[i].ID
		if items[i].Tags == nil {
			items[i].Tags = []TagDTO{}
		}
	}
	tagMap, err := s.loadCategoryTagsMap(ctx, ids)
	if err != nil {
		return err
	}
	for i := range items {
		if tags := tagMap[items[i].ID]; tags != nil {
			items[i].Tags = tags
		}
	}
	return nil
}

func planKeyOK(key string) bool {
	for _, r := range key {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			continue
		}
		return false
	}
	return true
}

func categoryOrderSQL(sortBy, sortDir string) string {
	dir := "ASC"
	if strings.EqualFold(strings.TrimSpace(sortDir), "desc") {
		dir = "DESC"
	}
	switch strings.TrimSpace(sortBy) {
	case "updatedAt":
		return "updated_at " + dir + ", position ASC"
	case "name":
		return "name_id " + dir + ", position ASC"
	default:
		return "position " + dir + ", updated_at DESC"
	}
}

func (s *Service) ListCategories(ctx context.Context, page, pageSize int, search, status, sortBy, sortDir string, admin bool, tagSlugs []string) (*CategoryListResult, error) {
	page = normalizePage(page)
	pageSize = normalizePageSize(pageSize)
	tagSlugs = normalizeTagSlugList(tagSlugs, "")
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	if !admin {
		where = append(where, "status = 'PUBLISHED'")
	} else if st := strings.ToUpper(strings.TrimSpace(status)); st != "" && st != "ALL" {
		where = append(where, "status = $"+itoa(len(args)+1)+"::learning_category_status")
		args = append(args, st)
	}
	if q := strings.TrimSpace(search); q != "" {
		args = append(args, "%"+q+"%")
		n := itoa(len(args))
		where = append(where, "(name_id ILIKE $"+n+" OR name_en ILIKE $"+n+" OR slug ILIKE $"+n+")")
	}
	if len(tagSlugs) == 1 {
		args = append(args, tagSlugs[0])
		n := itoa(len(args))
		where = append(where, `EXISTS (
			SELECT 1 FROM learning_category_tag ct
			JOIN learning_tag t ON t.id = ct.tag_id
			WHERE ct.category_id = learning_category.id AND t.slug = $`+n+`
		)`)
	} else if len(tagSlugs) > 1 {
		args = append(args, tagSlugs)
		n := itoa(len(args))
		where = append(where, `EXISTS (
			SELECT 1 FROM learning_category_tag ct
			JOIN learning_tag t ON t.id = ct.tag_id
			WHERE ct.category_id = learning_category.id AND t.slug = ANY($`+n+`::text[])
		)`)
	}
	whereSQL := strings.Join(where, " AND ")
	lessonStatus := ""
	if !admin {
		lessonStatus = " AND m.status = 'PUBLISHED'"
	}
	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM learning_category WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, apperrors.Internal(err)
	}
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := s.Pool.Query(ctx, `
		SELECT id, slug, name_id, name_en, description_id, description_en, cover_object_key,
		       position, status::text, plan_key, created_at, updated_at,
		       (SELECT COUNT(*)::int FROM learning_material m
		         WHERE m.category_id = learning_category.id AND m.deleted_at IS NULL
		           AND m.visibility = 'STUDENT'`+lessonStatus+`)
		FROM learning_category
		WHERE `+whereSQL+`
		ORDER BY `+categoryOrderSQL(sortBy, sortDir)+`
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args))+`
	`, args...)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	items := make([]CategoryDTO, 0)
	for rows.Next() {
		var c CategoryDTO
		var created, updated time.Time
		if err := rows.Scan(
			&c.ID, &c.Slug, &c.NameID, &c.NameEN, &c.DescriptionID, &c.DescriptionEN, &c.CoverObjectKey,
			&c.Position, &c.Status, &c.PlanKey, &created, &updated, &c.LessonCount,
		); err != nil {
			return nil, apperrors.Internal(err)
		}
		c.CoverURL = s.coverURL(c.CoverObjectKey)
		c.CreatedAt = formatTime(created)
		c.UpdatedAt = formatTime(updated)
		c.Tags = []TagDTO{}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}
	if err := s.attachCategoryTags(ctx, items); err != nil {
		return nil, err
	}
	pages := 0
	if total > 0 {
		pages = int(math.Ceil(float64(total) / float64(pageSize)))
	}
	return &CategoryListResult{Items: items, Page: page, PageSize: pageSize, Total: total, TotalPages: pages}, nil
}

func (s *Service) GetCategory(ctx context.Context, id string) (*CategoryDTO, error) {
	var c CategoryDTO
	var created, updated time.Time
	err := s.Pool.QueryRow(ctx, `
		SELECT id, slug, name_id, name_en, description_id, description_en, cover_object_key,
		       position, status::text, plan_key, created_at, updated_at,
		       (SELECT COUNT(*)::int FROM learning_material m
		         WHERE m.category_id = learning_category.id AND m.deleted_at IS NULL AND m.visibility = 'STUDENT')
		FROM learning_category
		WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(
		&c.ID, &c.Slug, &c.NameID, &c.NameEN, &c.DescriptionID, &c.DescriptionEN, &c.CoverObjectKey,
		&c.Position, &c.Status, &c.PlanKey, &created, &updated, &c.LessonCount,
	)
	if err == pgx.ErrNoRows {
		return nil, apperrors.NotFound("category")
	}
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	c.CoverURL = s.coverURL(c.CoverObjectKey)
	c.CreatedAt = formatTime(created)
	c.UpdatedAt = formatTime(updated)
	c.Tags = []TagDTO{}
	tagMap, err := s.loadCategoryTagsMap(ctx, []string{c.ID})
	if err != nil {
		return nil, err
	}
	if tags := tagMap[c.ID]; tags != nil {
		c.Tags = tags
	}
	return &c, nil
}

func (s *Service) CreateCategory(ctx context.Context, in CategoryInput) (*CategoryDTO, error) {
	normalized, err := normalizeCategory(in, true)
	if err != nil {
		return nil, err
	}
	slug, err := s.uniqueCategorySlug(ctx, preferredSlugSource(normalized.NameEN, normalized.NameID), "")
	if err != nil {
		return nil, err
	}
	var next int
	if err := s.Pool.QueryRow(ctx, `SELECT COALESCE(MAX(position),0)+1 FROM learning_category WHERE deleted_at IS NULL`).Scan(&next); err != nil {
		return nil, apperrors.Internal(err)
	}
	id := uuid.NewString()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `
		INSERT INTO learning_category (
		  id, slug, name_id, name_en, description_id, description_en, cover_object_key,
		  position, status, plan_key, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::learning_category_status,$10,NOW(),NOW())
	`, id, slug, normalized.NameID, normalized.NameEN, normalized.DescriptionID, normalized.DescriptionEN,
		nullIfEmptyPtr(normalized.CoverObjectKey), next, normalized.Status, normalized.PlanKey)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if err := s.replaceCategoryTags(ctx, tx, id, normalized.Tags); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.GetCategory(ctx, id)
}

func (s *Service) UpdateCategory(ctx context.Context, id string, in CategoryInput) (*CategoryDTO, error) {
	existing, err := s.GetCategory(ctx, id)
	if err != nil {
		return nil, err
	}
	normalized, err := normalizeCategory(in, true)
	if err != nil {
		return nil, err
	}
	cover := existing.CoverObjectKey
	if in.CoverObjectKey != nil {
		cover = nullIfEmptyPtr(in.CoverObjectKey)
	}
	slug := existing.Slug
	if existing.Status == "DRAFT" && normalized.Status == "DRAFT" {
		nextSlug, slugErr := s.uniqueCategorySlug(ctx, preferredSlugSource(normalized.NameEN, normalized.NameID), id)
		if slugErr != nil {
			return nil, slugErr
		}
		slug = nextSlug
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `
		UPDATE learning_category
		SET slug=$2, name_id=$3, name_en=$4, description_id=$5, description_en=$6,
		    cover_object_key=$7, status=$8::learning_category_status, plan_key=$9, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id, slug, normalized.NameID, normalized.NameEN, normalized.DescriptionID, normalized.DescriptionEN,
		cover, normalized.Status, normalized.PlanKey)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if err := s.replaceCategoryTags(ctx, tx, id, normalized.Tags); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	if existing.CoverObjectKey != nil && (cover == nil || *existing.CoverObjectKey != *cover) && s.Media != nil {
		_ = s.Media.DeleteObject(*existing.CoverObjectKey)
	}
	return s.GetCategory(ctx, id)
}

func (s *Service) ArchiveCategory(ctx context.Context, id string) error {
	tag, err := s.Pool.Exec(ctx, `
		UPDATE learning_category SET status='ARCHIVED'::learning_category_status, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("category")
	}
	return nil
}

func (s *Service) HardDeleteCategory(ctx context.Context, id string) error {
	var cover *string
	var n int
	err := s.Pool.QueryRow(ctx, `
		SELECT cover_object_key,
		       (SELECT COUNT(*)::int FROM learning_material m WHERE m.category_id = learning_category.id AND m.deleted_at IS NULL)
		FROM learning_category WHERE id=$1 AND deleted_at IS NULL
	`, id).Scan(&cover, &n)
	if err == pgx.ErrNoRows {
		return apperrors.NotFound("category")
	}
	if err != nil {
		return apperrors.Internal(err)
	}
	if n > 0 {
		return apperrors.Conflict(apperrors.CodeConflict, "Move or delete lessons before deleting this category", "Pindahkan atau hapus materi sebelum menghapus kategori")
	}
	if _, err := s.Pool.Exec(ctx, `DELETE FROM learning_category WHERE id=$1`, id); err != nil {
		return apperrors.Internal(err)
	}
	if cover != nil && s.Media != nil {
		_ = s.Media.DeleteObject(*cover)
	}
	return nil
}

func (s *Service) BulkHardDeleteLessons(ctx context.Context, categoryID string, ids []string) (int, error) {
	if _, err := s.GetCategory(ctx, categoryID); err != nil {
		return 0, err
	}
	if len(ids) == 0 || len(ids) > 50 {
		return 0, apperrors.Validation("Select between 1 and 50 lessons to delete", "Pilih 1 sampai 50 materi untuk dihapus")
	}
	seen := map[string]struct{}{}
	clean := make([]string, 0, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		clean = append(clean, id)
	}
	if len(clean) == 0 {
		return 0, apperrors.Validation("Select at least one lesson", "Pilih minimal satu materi")
	}

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return 0, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `SELECT id FROM learning_category WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, categoryID); err != nil {
		return 0, apperrors.Internal(err)
	}

	rows, err := tx.Query(ctx, `
		SELECT id, cover_object_key
		FROM learning_material
		WHERE category_id = $1
		  AND deleted_at IS NULL
		  AND visibility = 'STUDENT'
		  AND id = ANY($2)
		FOR UPDATE
	`, categoryID, clean)
	if err != nil {
		return 0, apperrors.Internal(err)
	}
	found := map[string]struct{}{}
	covers := make([]string, 0, len(clean))
	for rows.Next() {
		var id string
		var cover *string
		if err := rows.Scan(&id, &cover); err != nil {
			rows.Close()
			return 0, apperrors.Internal(err)
		}
		found[id] = struct{}{}
		if cover != nil && strings.TrimSpace(*cover) != "" {
			covers = append(covers, strings.TrimSpace(*cover))
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, apperrors.Internal(err)
	}
	if len(found) != len(clean) {
		return 0, apperrors.Validation(
			"One or more lessons are not in this category",
			"Satu atau lebih materi tidak ada di kategori ini",
		)
	}

	tag, err := tx.Exec(ctx, `
		DELETE FROM learning_material
		WHERE category_id = $1
		  AND visibility = 'STUDENT'
		  AND id = ANY($2)
	`, categoryID, clean)
	if err != nil {
		return 0, apperrors.Internal(err)
	}
	deleted := int(tag.RowsAffected())

	remain, err := tx.Query(ctx, `
		SELECT id FROM learning_material
		WHERE category_id = $1 AND deleted_at IS NULL AND visibility = 'STUDENT'
		ORDER BY position ASC NULLS LAST, created_at ASC, id ASC
	`, categoryID)
	if err != nil {
		return 0, apperrors.Internal(err)
	}
	remainIDs := make([]string, 0, 32)
	for remain.Next() {
		var id string
		if err := remain.Scan(&id); err != nil {
			remain.Close()
			return 0, apperrors.Internal(err)
		}
		remainIDs = append(remainIDs, id)
	}
	remain.Close()
	if err := remain.Err(); err != nil {
		return 0, apperrors.Internal(err)
	}
	for i, id := range remainIDs {
		if _, err := tx.Exec(ctx, `
			UPDATE learning_material SET position = $2, updated_at = NOW() WHERE id = $1
		`, id, -(i + 1)); err != nil {
			return 0, apperrors.Internal(err)
		}
	}
	for i, id := range remainIDs {
		if _, err := tx.Exec(ctx, `
			UPDATE learning_material SET position = $2, updated_at = NOW() WHERE id = $1
		`, id, i+1); err != nil {
			return 0, apperrors.Internal(err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, apperrors.Internal(err)
	}
	if s.Media != nil {
		for _, key := range covers {
			_ = s.Media.DeleteObject(key)
		}
	}
	return deleted, nil
}

func (s *Service) ReorderLessons(ctx context.Context, categoryID string, ids []string) error {
	if _, err := s.GetCategory(ctx, categoryID); err != nil {
		return err
	}
	if len(ids) == 0 || len(ids) > 200 {
		return apperrors.Validation("Invalid lesson order", "Urutan materi tidak valid")
	}
	seen := map[string]struct{}{}
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			return apperrors.Validation("Duplicate lesson in order", "Urutan materi duplikat")
		}
		seen[id] = struct{}{}
	}
	var total int
	if err := s.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM learning_material
		WHERE category_id=$1 AND deleted_at IS NULL AND visibility='STUDENT'
	`, categoryID).Scan(&total); err != nil {
		return apperrors.Internal(err)
	}
	if total != len(ids) {
		return apperrors.Validation("Order must include every lesson in the category", "Urutan harus memuat semua materi di kategori")
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `SELECT id FROM learning_category WHERE id=$1 FOR UPDATE`, categoryID); err != nil {
		return apperrors.Internal(err)
	}
	for i, id := range ids {
		tag, err := tx.Exec(ctx, `
			UPDATE learning_material
			SET position = $3, updated_at = NOW()
			WHERE id = $1 AND category_id = $2 AND deleted_at IS NULL AND visibility = 'STUDENT'
		`, id, categoryID, -(i + 1))
		if err != nil {
			return apperrors.Internal(err)
		}
		if tag.RowsAffected() == 0 {
			return apperrors.Validation("Lesson is not in this category", "Materi tidak ada di kategori ini")
		}
	}
	for i, id := range ids {
		if _, err := tx.Exec(ctx, `
			UPDATE learning_material SET position = $2, updated_at = NOW() WHERE id = $1
		`, id, i+1); err != nil {
			return apperrors.Internal(err)
		}
	}
	return tx.Commit(ctx)
}

func (s *Service) StudentCategories(ctx context.Context, userID string, page, pageSize int, search, sortBy, sortDir string, tagSlugs []string) (*CategoryListResult, error) {
	result, err := s.ListCategories(ctx, page, pageSize, search, "PUBLISHED", sortBy, sortDir, false, tagSlugs)
	if err != nil {
		return nil, err
	}
	filtered := make([]CategoryDTO, 0, len(result.Items))
	ids := make([]string, 0, len(result.Items))
	for _, c := range result.Items {
		ok, err := s.userHasPlan(ctx, userID, c.PlanKey)
		if err != nil {
			return nil, err
		}
		if ok {
			filtered = append(filtered, c)
			ids = append(ids, c.ID)
		}
	}
	if len(ids) > 0 {
		rows, err := s.Pool.Query(ctx, `
			SELECT m.category_id::text, COUNT(*)::int
			FROM learning_lesson_progress p
			JOIN learning_material m ON m.id = p.material_id
			WHERE p.user_id = $1
			  AND m.category_id::text = ANY($2)
			  AND p.status = 'completed'
			  AND m.deleted_at IS NULL AND m.status = 'PUBLISHED' AND m.visibility = 'STUDENT'
			GROUP BY m.category_id
		`, userID, ids)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		defer rows.Close()
		done := map[string]int{}
		for rows.Next() {
			var id string
			var n int
			if err := rows.Scan(&id, &n); err != nil {
				return nil, apperrors.Internal(err)
			}
			done[id] = n
		}
		if err := rows.Err(); err != nil {
			return nil, apperrors.Internal(err)
		}
		for i := range filtered {
			filtered[i].CompletedCount = done[filtered[i].ID]
		}
	}
	result.Items = filtered
	return result, nil
}

func (s *Service) ListStudentCategoryTags(ctx context.Context, limit int) ([]TagDTO, error) {
	if limit < 1 || limit > 80 {
		limit = 40
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT t.id, t.slug, t.name_id, t.name_en, COUNT(*)::int AS usage_count
		FROM learning_tag t
		JOIN learning_category_tag ct ON ct.tag_id = t.id
		JOIN learning_category c ON c.id = ct.category_id
		WHERE c.deleted_at IS NULL
		  AND c.status = 'PUBLISHED'
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

func (s *Service) StudentCategoryPath(ctx context.Context, userID, slug, locale string) (*StudentCategoryDetail, error) {
	var id, plan string
	var card StudentCategoryCard
	var cover *string
	err := s.Pool.QueryRow(ctx, `
		SELECT id, slug, name_id, name_en, description_id, description_en, cover_object_key, plan_key
		FROM learning_category
		WHERE slug = $1 AND deleted_at IS NULL AND status = 'PUBLISHED'
	`, slug).Scan(&id, &card.Slug, &card.NameID, &card.NameEN, &card.DescriptionID, &card.DescriptionEN, &cover, &plan)
	if err == pgx.ErrNoRows {
		return nil, apperrors.NotFound("category")
	}
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	card.ID = id
	card.PlanKey = plan
	card.CoverURL = s.coverURL(cover)
	card.Tags = []TagDTO{}
	if err := s.assertCategoryAccess(ctx, userID, plan); err != nil {
		return nil, err
	}
	tagMap, err := s.loadCategoryTagsMap(ctx, []string{id})
	if err != nil {
		return nil, err
	}
	if tags := tagMap[id]; tags != nil {
		card.Tags = tags
	}
	lessons, err := s.publishedLessons(ctx, id, locale)
	if err != nil {
		return nil, err
	}
	done, reading, err := s.completedSet(ctx, userID, lessons)
	if err != nil {
		return nil, err
	}
	out := make([]PathLessonDTO, 0, len(lessons))
	completed := 0
	for _, l := range lessons {
		locked := !lessonUnlocked(lessons, done, l.ID)
		isDone := done[l.ID]
		if isDone {
			completed++
		}
		out = append(out, PathLessonDTO{
			ID: l.ID, Slug: l.Slug, Title: l.Title, Excerpt: l.Excerpt, Position: l.Position,
			Status: l.Status, CoverURL: s.coverURL(l.CoverKey),
			// Completed lessons stay open forever for review/retake; only incomplete future steps lock.
			Locked: locked && !isDone, Completed: isDone,
			InProgress: !isDone && !locked && reading[l.ID] > 0,
			ReadingPercent: reading[l.ID],
		})
	}
	card.LessonCount = len(out)
	card.CompletedCount = completed
	pathCompleted := len(out) > 0 && completed >= len(out)
	detail := &StudentCategoryDetail{
		StudentCategoryCard: card,
		Lessons:             out,
		PathCompleted:       pathCompleted,
	}
	if pathCompleted {
		completion, err := s.buildPathCompletion(ctx, userID, id, locale)
		if err != nil {
			return nil, err
		}
		detail.Completion = completion
	}
	return detail, nil
}

func (s *Service) OpenStudentLesson(ctx context.Context, userID, slug, locale string, bypassLock bool) (*StudentLessonView, error) {
	detail, err := s.GetBySlug(ctx, slug, false, true)
	if err != nil {
		return nil, err
	}
	if detail.CategoryID == nil || *detail.CategoryID == "" {
		return nil, apperrors.NotFound("material")
	}
	var catSlug, nameID, nameEN, plan, catStatus string
	err = s.Pool.QueryRow(ctx, `
		SELECT slug, name_id, name_en, plan_key, status::text
		FROM learning_category WHERE id=$1 AND deleted_at IS NULL
	`, *detail.CategoryID).Scan(&catSlug, &nameID, &nameEN, &plan, &catStatus)
	if err == pgx.ErrNoRows || catStatus != "PUBLISHED" {
		return nil, apperrors.NotFound("material")
	}
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if !bypassLock {
		if err := s.assertCategoryAccess(ctx, userID, plan); err != nil {
			return nil, err
		}
	}
	lessons, err := s.publishedLessons(ctx, *detail.CategoryID, locale)
	if err != nil {
		return nil, err
	}
	done, reading, err := s.completedSet(ctx, userID, lessons)
	if err != nil {
		return nil, err
	}
	// Completed lessons remain reopenable for review and unlimited practice retries.
	if !bypassLock && !done[detail.ID] && !lessonUnlocked(lessons, done, detail.ID) {
		return nil, apperrors.LessonLocked()
	}
	qs, err := s.loadQuestions(ctx, detail.ID, false)
	if err != nil {
		return nil, err
	}
	completed := 0
	pathLessons := make([]PathLessonDTO, 0, len(lessons))
	for _, l := range lessons {
		isDone := done[l.ID]
		if isDone {
			completed++
		}
		locked := !lessonUnlocked(lessons, done, l.ID)
		pathLessons = append(pathLessons, PathLessonDTO{
			ID: l.ID, Slug: l.Slug, Title: l.Title, Excerpt: l.Excerpt, Position: l.Position,
			Status: l.Status, CoverURL: s.coverURL(l.CoverKey),
			Locked: locked && !isDone, Completed: isDone,
			InProgress: !isDone && !locked && reading[l.ID] > 0,
			ReadingPercent: reading[l.ID],
		})
	}
	var next *string
	nextLocked := false
	for i, l := range lessons {
		if l.ID == detail.ID && i+1 < len(lessons) {
			slugNext := lessons[i+1].Slug
			next = &slugNext
			nextDone := done[lessons[i+1].ID]
			nextLocked = !nextDone && !lessonUnlocked(lessons, done, lessons[i+1].ID)
			break
		}
	}
	status := "in_progress"
	if done[detail.ID] {
		status = "completed"
	}
	pathCompleted := len(lessons) > 0 && completed >= len(lessons)
	var completion *PathCompletionDTO
	if pathCompleted && detail.CategoryID != nil {
		completion, err = s.buildPathCompletion(ctx, userID, *detail.CategoryID, locale)
		if err != nil {
			return nil, err
		}
	}
	return &StudentLessonView{
		Material: detail, CategorySlug: catSlug, CategoryNameID: nameID, CategoryNameEN: nameEN,
		CompletedCount: completed, LessonCount: len(lessons),
		Progress: LessonProgressDTO{
			Status: status, ReadingPercent: reading[detail.ID], Completed: done[detail.ID],
		},
		Questions: shufflePublicPractice(
			toPublicQuestions(qs),
			detail.ShuffleQuestions,
			detail.ShuffleChoices,
		),
		Lessons: pathLessons,
		NextSlug: next, NextLocked: nextLocked,
		PathCompleted: pathCompleted, Completion: completion,
	}, nil
}

func (s *Service) TouchProgress(ctx context.Context, userID, slug string, percent int) (*LessonProgressDTO, error) {
	view, err := s.OpenStudentLesson(ctx, userID, slug, "id", false)
	if err != nil {
		return nil, err
	}
	if percent < 0 {
		percent = 0
	}
	if percent > 100 {
		percent = 100
	}
	completed := view.Progress.Completed
	status := "in_progress"
	var completedAt *time.Time
	if len(view.Questions) == 0 {
		completed = true
		status = "completed"
		now := time.Now().UTC()
		completedAt = &now
		if percent < 100 {
			percent = 100
		}
	} else if completed {
		status = "completed"
		now := time.Now().UTC()
		completedAt = &now
	}
	_, err = s.Pool.Exec(ctx, `
		INSERT INTO learning_lesson_progress (user_id, material_id, status, reading_percent, last_opened_at, completed_at)
		VALUES ($1,$2,$3::learning_progress_status,$4,NOW(),$5)
		ON CONFLICT (user_id, material_id) DO UPDATE
		SET reading_percent = GREATEST(learning_lesson_progress.reading_percent, EXCLUDED.reading_percent),
		    status = CASE
		      WHEN learning_lesson_progress.status = 'completed' THEN 'completed'::learning_progress_status
		      ELSE EXCLUDED.status
		    END,
		    last_opened_at = NOW(),
		    completed_at = COALESCE(learning_lesson_progress.completed_at, EXCLUDED.completed_at)
	`, userID, view.Material.ID, status, percent, completedAt)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return &LessonProgressDTO{Status: status, ReadingPercent: percent, Completed: completed || status == "completed"}, nil
}

func (s *Service) SubmitQuiz(ctx context.Context, userID, slug string, in QuizSubmitInput) (*QuizSubmitResult, error) {
	attemptID := strings.TrimSpace(in.AttemptID)
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, apperrors.Validation("Invalid attempt id", "ID percobaan tidak valid")
	}
	var existingUser, existingMaterial string
	var existingScore int
	var existingPassed bool
	err := s.Pool.QueryRow(ctx, `
		SELECT user_id, material_id, score, passed FROM learning_quiz_attempt WHERE id=$1
	`, attemptID).Scan(&existingUser, &existingMaterial, &existingScore, &existingPassed)
	if err == nil {
		if existingUser != userID {
			return nil, apperrors.Conflict(apperrors.CodeConflict, "Attempt id already used", "ID percobaan sudah dipakai")
		}
		return s.quizResultFromAttempt(ctx, userID, slug, attemptID, existingScore, existingPassed)
	}
	if err != pgx.ErrNoRows {
		return nil, apperrors.Internal(err)
	}

	view, err := s.OpenStudentLesson(ctx, userID, slug, "id", false)
	if err != nil {
		return nil, err
	}
	adminQs, err := s.loadQuestions(ctx, view.Material.ID, true)
	if err != nil {
		return nil, err
	}
	if len(adminQs) == 0 {
		return nil, apperrors.Validation("This lesson has no practice", "Materi ini tidak punya latihan")
	}
	byID := map[string]QuizAnswerInput{}
	for _, a := range in.Answers {
		byID[a.QuestionID] = a
	}
	if len(byID) != len(adminQs) {
		return nil, apperrors.Validation("Answer every question", "Jawab semua soal")
	}

	type graded struct {
		q       QuestionAdminDTO
		correct bool
		optID   *string
		text    string
		knew    *bool
	}
	grades := make([]graded, 0, len(adminQs))
	correctN := 0
	for _, q := range adminQs {
		a, ok := byID[q.ID]
		if !ok {
			return nil, apperrors.Validation("Answer every question", "Jawab semua soal")
		}
		g := graded{q: q, text: strings.TrimSpace(a.TextAnswer)}
		switch q.Type {
		case "multiple_choice":
			if a.SelectedOptionID == "" {
				return nil, apperrors.Validation("Choose an option", "Pilih salah satu opsi")
			}
			found := false
			for _, opt := range q.Options {
				if opt.ID == a.SelectedOptionID {
					found = true
					g.correct = opt.Correct
					id := opt.ID
					g.optID = &id
					break
				}
			}
			if !found {
				return nil, apperrors.Validation("Invalid option", "Opsi tidak valid")
			}
		case "short_answer":
			got := normalizeAnswerText(a.TextAnswer)
			if got == "" {
				return nil, apperrors.Validation("Answer is required", "Jawaban wajib diisi")
			}
			for _, acc := range q.AcceptedAnswers {
				if normalizeAnswerText(acc) == got {
					g.correct = true
					break
				}
			}
		case "flashcard":
			if a.Knew == nil {
				return nil, apperrors.Validation("Mark the flashcard", "Tandai kartu kuis")
			}
			g.knew = a.Knew
			g.correct = *a.Knew
		}
		if g.correct {
			correctN++
		}
		grades = append(grades, g)
	}
	score := int(math.Round(float64(correctN) * 100 / float64(len(adminQs))))
	passScore := view.Material.PassScore
	if passScore < 50 {
		passScore = 80
	}
	passed := score >= passScore

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	// Serialize concurrent submits for the same student/lesson.
	if _, err := tx.Exec(ctx, `
		SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))
	`, userID, view.Material.ID); err != nil {
		return nil, apperrors.Internal(err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO learning_quiz_attempt (id, user_id, material_id, score, passed, created_at)
		VALUES ($1,$2,$3,$4,$5,NOW())
	`, attemptID, userID, view.Material.ID, score, passed)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	for _, g := range grades {
		if _, err := tx.Exec(ctx, `
			INSERT INTO learning_quiz_answer (attempt_id, question_id, selected_option_id, text_answer, knew, correct)
			VALUES ($1,$2,$3,$4,$5,$6)
		`, attemptID, g.q.ID, g.optID, g.text, g.knew, g.correct); err != nil {
			return nil, apperrors.Internal(err)
		}
	}
	// Cap history per lesson (answers cascade) so storage stays bounded under heavy retry traffic.
	if _, err := tx.Exec(ctx, `
		DELETE FROM learning_quiz_attempt
		WHERE id IN (
			SELECT id FROM learning_quiz_attempt
			WHERE user_id = $1 AND material_id = $2
			ORDER BY created_at DESC
			OFFSET 50
		)
	`, userID, view.Material.ID); err != nil {
		return nil, apperrors.Internal(err)
	}
	if passed {
		if _, err := tx.Exec(ctx, `
			INSERT INTO learning_lesson_progress (user_id, material_id, status, reading_percent, last_opened_at, completed_at)
			VALUES ($1,$2,'completed',100,NOW(),NOW())
			ON CONFLICT (user_id, material_id) DO UPDATE
			SET status='completed'::learning_progress_status,
			    reading_percent=100,
			    last_opened_at=NOW(),
			    completed_at=COALESCE(learning_lesson_progress.completed_at, NOW())
		`, userID, view.Material.ID); err != nil {
			return nil, apperrors.Internal(err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.quizResultFromAttempt(ctx, userID, slug, attemptID, score, passed)
}

type storedAnswer struct {
	correct  bool
	optID    string
	text     string
	knew     *bool
}

func (s *Service) loadAttemptAnswers(ctx context.Context, attemptID string) (map[string]storedAnswer, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT question_id, correct, COALESCE(selected_option_id, ''), COALESCE(text_answer, ''), knew
		FROM learning_quiz_answer WHERE attempt_id = $1
	`, attemptID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := map[string]storedAnswer{}
	for rows.Next() {
		var qid string
		var a storedAnswer
		var knew *bool
		if err := rows.Scan(&qid, &a.correct, &a.optID, &a.text, &knew); err != nil {
			return nil, apperrors.Internal(err)
		}
		a.knew = knew
		out[qid] = a
	}
	return out, rows.Err()
}

func buildReviewsFromAttempt(adminQs []QuestionAdminDTO, answers map[string]storedAnswer) []QuestionReviewDTO {
	reviews := make([]QuestionReviewDTO, 0, len(adminQs))
	for _, q := range adminQs {
		pub := toPublicQuestions([]QuestionAdminDTO{q})[0]
		correctOpt := ""
		for _, o := range q.Options {
			if o.Correct {
				correctOpt = o.ID
				break
			}
		}
		ans := answers[q.ID]
		reviews = append(reviews, QuestionReviewDTO{
			QuestionPublicDTO: pub,
			ExplanationID:     q.ExplanationID,
			ExplanationEN:     q.ExplanationEN,
			AnswerID:          q.AnswerID,
			AnswerEN:          q.AnswerEN,
			AcceptedAnswers:   q.AcceptedAnswers,
			CorrectOptionID:   correctOpt,
			Correct:           ans.correct,
			SelectedOptionID:  ans.optID,
			TextAnswer:        ans.text,
			Knew:              ans.knew,
		})
	}
	return reviews
}

func (s *Service) quizResultFromAttempt(ctx context.Context, userID, slug, attemptID string, score int, passed bool) (*QuizSubmitResult, error) {
	view, err := s.OpenStudentLesson(ctx, userID, slug, "id", true)
	if err != nil {
		return nil, err
	}
	adminQs, err := s.loadQuestions(ctx, view.Material.ID, true)
	if err != nil {
		return nil, err
	}
	answers, err := s.loadAttemptAnswers(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	reviews := buildReviewsFromAttempt(adminQs, answers)
	passScore := view.Material.PassScore
	if passScore < 50 {
		passScore = 80
	}
	pathCompleted := view.LessonCount > 0 && view.CompletedCount >= view.LessonCount
	var completion *PathCompletionDTO
	if pathCompleted && view.Material.CategoryID != nil {
		completion, err = s.buildPathCompletion(ctx, userID, *view.Material.CategoryID, "id")
		if err != nil {
			return nil, err
		}
	}
	return &QuizSubmitResult{
		AttemptID: attemptID, Score: score, Passed: passed, PassScore: passScore,
		Reviews: reviews, NextSlug: view.NextSlug, NextLocked: view.NextLocked,
		PathCompleted: pathCompleted, Completion: completion,
	}, nil
}

const quizAttemptHistoryCap = 50

// ListQuizAttempts returns practice history for the current student on one lesson.
// Unlock/progress still use the newest attempt; older rows stay for student review.
func (s *Service) ListQuizAttempts(ctx context.Context, userID, slug string, limit int) (*QuizAttemptListResult, error) {
	if limit < 1 || limit > quizAttemptHistoryCap {
		limit = quizAttemptHistoryCap
	}
	view, err := s.OpenStudentLesson(ctx, userID, slug, "id", false)
	if err != nil {
		return nil, err
	}
	var total int
	if err := s.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM learning_quiz_attempt
		WHERE user_id = $1 AND material_id = $2
	`, userID, view.Material.ID).Scan(&total); err != nil {
		return nil, apperrors.Internal(err)
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT id, score, passed, created_at
		FROM learning_quiz_attempt
		WHERE user_id = $1 AND material_id = $2
		ORDER BY created_at DESC
		LIMIT $3
	`, userID, view.Material.ID, limit)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	items := make([]QuizAttemptSummary, 0, limit)
	for rows.Next() {
		var item QuizAttemptSummary
		var createdAt time.Time
		if err := rows.Scan(&item.ID, &item.Score, &item.Passed, &createdAt); err != nil {
			return nil, apperrors.Internal(err)
		}
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}
	// Number oldest→newest across full history (not just this page).
	for i := range items {
		items[i].AttemptNumber = total - i
	}
	return &QuizAttemptListResult{Items: items, Total: total, LatestOnly: true}, nil
}

// GetQuizAttempt returns one owned attempt with full question-level review for study.
func (s *Service) GetQuizAttempt(ctx context.Context, userID, slug, attemptID string) (*QuizAttemptDetail, error) {
	attemptID = strings.TrimSpace(attemptID)
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, apperrors.Validation("Invalid attempt id", "ID percobaan tidak valid")
	}
	view, err := s.OpenStudentLesson(ctx, userID, slug, "id", false)
	if err != nil {
		return nil, err
	}
	var owner, materialID string
	var score int
	var passed bool
	var createdAt time.Time
	err = s.Pool.QueryRow(ctx, `
		SELECT user_id, material_id, score, passed, created_at
		FROM learning_quiz_attempt WHERE id = $1
	`, attemptID).Scan(&owner, &materialID, &score, &passed, &createdAt)
	if err == pgx.ErrNoRows {
		return nil, apperrors.NotFound("attempt")
	}
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if owner != userID || materialID != view.Material.ID {
		// Do not leak existence of other users' attempts.
		return nil, apperrors.NotFound("attempt")
	}
	var older int
	if err := s.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM learning_quiz_attempt
		WHERE user_id = $1 AND material_id = $2 AND created_at < $3
	`, userID, view.Material.ID, createdAt).Scan(&older); err != nil {
		return nil, apperrors.Internal(err)
	}
	adminQs, err := s.loadQuestions(ctx, view.Material.ID, true)
	if err != nil {
		return nil, err
	}
	answers, err := s.loadAttemptAnswers(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	passScore := view.Material.PassScore
	if passScore < 50 {
		passScore = 80
	}
	return &QuizAttemptDetail{
		QuizAttemptSummary: QuizAttemptSummary{
			ID: attemptID, Score: score, Passed: passed,
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
			AttemptNumber: older + 1,
		},
		PassScore: passScore,
		Reviews:   buildReviewsFromAttempt(adminQs, answers),
	}, nil
}

func (s *Service) buildPathCompletion(ctx context.Context, userID, categoryID, locale string) (*PathCompletionDTO, error) {
	var slug, nameID, nameEN string
	var position int
	if err := s.Pool.QueryRow(ctx, `
		SELECT slug, name_id, name_en, position
		FROM learning_category
		WHERE id = $1 AND deleted_at IS NULL AND status = 'PUBLISHED'
	`, categoryID).Scan(&slug, &nameID, &nameEN, &position); err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("category")
		}
		return nil, apperrors.Internal(err)
	}
	lessons, err := s.publishedLessons(ctx, categoryID, locale)
	if err != nil {
		return nil, err
	}
	done, _, err := s.completedSet(ctx, userID, lessons)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(lessons))
	for _, l := range lessons {
		ids = append(ids, l.ID)
	}
	qCount := map[string]int{}
	passBy := map[string]int{}
	if len(ids) > 0 {
		qRows, err := s.Pool.Query(ctx, `
			SELECT material_id::text, COUNT(*)::int
			FROM learning_question
			WHERE material_id::text = ANY($1)
			GROUP BY material_id
		`, ids)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		for qRows.Next() {
			var mid string
			var n int
			if err := qRows.Scan(&mid, &n); err != nil {
				qRows.Close()
				return nil, apperrors.Internal(err)
			}
			qCount[mid] = n
		}
		qRows.Close()
		if err := qRows.Err(); err != nil {
			return nil, apperrors.Internal(err)
		}
		pRows, err := s.Pool.Query(ctx, `
			SELECT id::text, pass_score FROM learning_material WHERE id::text = ANY($1)
		`, ids)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		for pRows.Next() {
			var mid string
			var ps int
			if err := pRows.Scan(&mid, &ps); err != nil {
				pRows.Close()
				return nil, apperrors.Internal(err)
			}
			passBy[mid] = clampPassScore(ps)
		}
		pRows.Close()
		if err := pRows.Err(); err != nil {
			return nil, apperrors.Internal(err)
		}
	}
	type attemptAgg struct {
		score  int
		passed bool
		count  int
	}
	latest := map[string]attemptAgg{}
	if len(ids) > 0 {
		aRows, err := s.Pool.Query(ctx, `
			SELECT DISTINCT ON (material_id)
			       material_id::text, score, passed,
			       (SELECT COUNT(*)::int FROM learning_quiz_attempt a2
			        WHERE a2.user_id = a.user_id AND a2.material_id = a.material_id) AS attempt_count
			FROM learning_quiz_attempt a
			WHERE user_id = $1 AND material_id::text = ANY($2)
			ORDER BY material_id, created_at DESC
		`, userID, ids)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		for aRows.Next() {
			var mid string
			var agg attemptAgg
			if err := aRows.Scan(&mid, &agg.score, &agg.passed, &agg.count); err != nil {
				aRows.Close()
				return nil, apperrors.Internal(err)
			}
			latest[mid] = agg
		}
		aRows.Close()
		if err := aRows.Err(); err != nil {
			return nil, apperrors.Internal(err)
		}
	}
	outLessons := make([]PathLessonScoreDTO, 0, len(lessons))
	completed := 0
	scoreSum := 0
	scoreN := 0
	for _, l := range lessons {
		isDone := done[l.ID]
		if isDone {
			completed++
		}
		hasQ := qCount[l.ID] > 0
		ps := passBy[l.ID]
		if ps < 50 {
			ps = 80
		}
		row := PathLessonScoreDTO{
			Slug: l.Slug, Title: l.Title, Position: l.Position,
			Completed: isDone, HasQuestions: hasQ, PassScore: ps,
			ReadingOnly: !hasQ,
		}
		if agg, ok := latest[l.ID]; ok {
			score := agg.score
			row.LatestScore = &score
			row.Passed = agg.passed
			row.AttemptCount = agg.count
			scoreSum += agg.score
			scoreN++
		} else if !hasQ && isDone {
			row.Passed = true
		}
		outLessons = append(outLessons, row)
	}
	var avg *float64
	if scoreN > 0 {
		v := float64(scoreSum) / float64(scoreN)
		avg = &v
	}
	nextPath, err := s.findNextLearningPath(ctx, userID, categoryID, position)
	if err != nil {
		return nil, err
	}
	return &PathCompletionDTO{
		CategorySlug: slug, CategoryNameID: nameID, CategoryNameEN: nameEN,
		LessonCount: len(lessons), CompletedCount: completed,
		AverageScore: avg, Lessons: outLessons, NextPath: nextPath,
	}, nil
}

func (s *Service) findNextLearningPath(ctx context.Context, userID, currentCategoryID string, currentPosition int) (*NextPathCardDTO, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT c.id, c.slug, c.name_id, c.name_en, c.cover_object_key, c.plan_key, c.position,
		       (SELECT COUNT(*)::int FROM learning_material m
		        WHERE m.category_id = c.id AND m.deleted_at IS NULL
		          AND m.status = 'PUBLISHED' AND m.visibility = 'STUDENT') AS lesson_count
		FROM learning_category c
		WHERE c.deleted_at IS NULL AND c.status = 'PUBLISHED' AND c.id <> $1
		ORDER BY
		  CASE WHEN c.position > $2 THEN 0 ELSE 1 END,
		  c.position ASC,
		  c.updated_at DESC
	`, currentCategoryID, currentPosition)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	type cand struct {
		id, slug, nameID, nameEN, plan string
		cover *string
		lessons int
	}
	cands := make([]cand, 0, 16)
	for rows.Next() {
		var c cand
		var pos int
		if err := rows.Scan(&c.id, &c.slug, &c.nameID, &c.nameEN, &c.cover, &c.plan, &pos, &c.lessons); err != nil {
			return nil, apperrors.Internal(err)
		}
		if c.lessons == 0 {
			continue
		}
		ok, err := s.userHasPlan(ctx, userID, c.plan)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		cands = append(cands, c)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}
	for _, c := range cands {
		var done int
		if err := s.Pool.QueryRow(ctx, `
			SELECT COUNT(*)::int
			FROM learning_lesson_progress p
			JOIN learning_material m ON m.id = p.material_id
			WHERE p.user_id = $1 AND m.category_id = $2
			  AND p.status = 'completed'
			  AND m.deleted_at IS NULL AND m.status = 'PUBLISHED' AND m.visibility = 'STUDENT'
		`, userID, c.id).Scan(&done); err != nil {
			return nil, apperrors.Internal(err)
		}
		if done >= c.lessons {
			continue // already finished — keep looking
		}
		return &NextPathCardDTO{
			Slug: c.slug, NameID: c.nameID, NameEN: c.nameEN,
			CoverURL: s.coverURL(c.cover), LessonCount: c.lessons,
			CompletedCount: done, PlanKey: c.plan,
		}, nil
	}
	return nil, nil
}
