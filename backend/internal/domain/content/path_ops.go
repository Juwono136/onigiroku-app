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
	return in, nil
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

func (s *Service) ListCategories(ctx context.Context, page, pageSize int, search, status, sortBy, sortDir string, admin bool) (*CategoryListResult, error) {
	page = normalizePage(page)
	pageSize = normalizePageSize(pageSize)
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
		items = append(items, c)
	}
	pages := 0
	if total > 0 {
		pages = int(math.Ceil(float64(total) / float64(pageSize)))
	}
	return &CategoryListResult{Items: items, Page: page, PageSize: pageSize, Total: total, TotalPages: pages}, rows.Err()
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
	_, err = s.Pool.Exec(ctx, `
		INSERT INTO learning_category (
		  id, slug, name_id, name_en, description_id, description_en, cover_object_key,
		  position, status, plan_key, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::learning_category_status,$10,NOW(),NOW())
	`, id, slug, normalized.NameID, normalized.NameEN, normalized.DescriptionID, normalized.DescriptionEN,
		nullIfEmptyPtr(normalized.CoverObjectKey), next, normalized.Status, normalized.PlanKey)
	if err != nil {
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
	_, err = s.Pool.Exec(ctx, `
		UPDATE learning_category
		SET slug=$2, name_id=$3, name_en=$4, description_id=$5, description_en=$6,
		    cover_object_key=$7, status=$8::learning_category_status, plan_key=$9, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id, slug, normalized.NameID, normalized.NameEN, normalized.DescriptionID, normalized.DescriptionEN,
		cover, normalized.Status, normalized.PlanKey)
	if err != nil {
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

func (s *Service) StudentCategories(ctx context.Context, userID string, page, pageSize int, search, sortBy, sortDir string) (*CategoryListResult, error) {
	result, err := s.ListCategories(ctx, page, pageSize, search, "PUBLISHED", sortBy, sortDir, false)
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
	if err := s.assertCategoryAccess(ctx, userID, plan); err != nil {
		return nil, err
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
			Locked: locked && !isDone, Completed: isDone,
			InProgress: !isDone && !locked && reading[l.ID] > 0,
			ReadingPercent: reading[l.ID],
		})
	}
	// A previously completed lesson stays readable, but a gap locks everything after it.
	for i := range out {
		if !lessonUnlocked(lessons, done, lessons[i].ID) {
			out[i].Locked = true
		}
	}
	card.LessonCount = len(out)
	card.CompletedCount = completed
	return &StudentCategoryDetail{StudentCategoryCard: card, Lessons: out}, nil
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
	if !bypassLock && !lessonUnlocked(lessons, done, detail.ID) {
		return nil, apperrors.LessonLocked()
	}
	qs, err := s.loadQuestions(ctx, detail.ID, false)
	if err != nil {
		return nil, err
	}
	completed := 0
	for _, l := range lessons {
		if done[l.ID] {
			completed++
		}
	}
	var next *string
	nextLocked := false
	for i, l := range lessons {
		if l.ID == detail.ID && i+1 < len(lessons) {
			slugNext := lessons[i+1].Slug
			next = &slugNext
			nextLocked = !lessonUnlocked(lessons, done, lessons[i+1].ID)
			break
		}
	}
	status := "in_progress"
	if done[detail.ID] {
		status = "completed"
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
		NextSlug: next, NextLocked: nextLocked,
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

func (s *Service) quizResultFromAttempt(ctx context.Context, userID, slug, attemptID string, score int, passed bool) (*QuizSubmitResult, error) {
	view, err := s.OpenStudentLesson(ctx, userID, slug, "id", true)
	if err != nil {
		return nil, err
	}
	adminQs, err := s.loadQuestions(ctx, view.Material.ID, true)
	if err != nil {
		return nil, err
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT question_id, correct FROM learning_quiz_answer WHERE attempt_id=$1
	`, attemptID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	correctBy := map[string]bool{}
	for rows.Next() {
		var qid string
		var ok bool
		if err := rows.Scan(&qid, &ok); err != nil {
			return nil, apperrors.Internal(err)
		}
		correctBy[qid] = ok
	}
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
		reviews = append(reviews, QuestionReviewDTO{
			QuestionPublicDTO: pub,
			ExplanationID:     q.ExplanationID,
			ExplanationEN:     q.ExplanationEN,
			AnswerID:          q.AnswerID,
			AnswerEN:          q.AnswerEN,
			AcceptedAnswers:   q.AcceptedAnswers,
			CorrectOptionID:   correctOpt,
			Correct:           correctBy[q.ID],
		})
	}
	passScore := view.Material.PassScore
	if passScore < 50 {
		passScore = 80
	}
	return &QuizSubmitResult{
		AttemptID: attemptID, Score: score, Passed: passed, PassScore: passScore,
		Reviews: reviews, NextSlug: view.NextSlug, NextLocked: view.NextLocked,
	}, rows.Err()
}
