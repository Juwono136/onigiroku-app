package content

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"

	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

// PublicListCourses returns published learning paths for the marketing catalog.
func (s *Service) PublicListCourses(ctx context.Context, page, pageSize int, search, sortBy, sortDir string, tagSlugs []string) (*CategoryListResult, error) {
	return s.ListCategories(ctx, page, pageSize, search, "PUBLISHED", sortBy, sortDir, false, tagSlugs)
}

// PublicPopularCourses returns the top N published paths by student view count.
func (s *Service) PublicPopularCourses(ctx context.Context, limit int) ([]CategoryDTO, error) {
	if limit < 1 {
		limit = 3
	}
	if limit > 12 {
		limit = 12
	}
	result, err := s.ListCategories(ctx, 1, limit, "", "PUBLISHED", "popular", "desc", false, nil)
	if err != nil {
		return nil, err
	}
	return result.Items, nil
}

// PublicGetCourse returns a published path with lesson teasers (lessons stay locked for guests).
func (s *Service) PublicGetCourse(ctx context.Context, slug, locale string) (*PublicCourseDetail, error) {
	locale = strings.TrimSpace(strings.ToLower(locale))
	if locale != "en" {
		locale = "id"
	}
	var id, plan string
	var card StudentCategoryCard
	var cover *string
	err := s.Pool.QueryRow(ctx, `
		SELECT id, slug, name_id, name_en, description_id, description_en, cover_object_key, plan_key,
		       COALESCE(student_view_count, 0)
		FROM learning_category
		WHERE slug = $1 AND deleted_at IS NULL AND status = 'PUBLISHED'
	`, slug).Scan(
		&id, &card.Slug, &card.NameID, &card.NameEN, &card.DescriptionID, &card.DescriptionEN,
		&cover, &plan, &card.StudentViewCount,
	)
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
	out := make([]PublicCourseLesson, 0, len(lessons))
	for _, l := range lessons {
		out = append(out, PublicCourseLesson{
			Slug: l.Slug, Title: l.Title, Excerpt: l.Excerpt, Position: l.Position,
			CoverURL: s.coverURL(l.CoverKey),
			Locked:   true, // public guests cannot open lesson content
		})
	}
	card.LessonCount = len(out)
	return &PublicCourseDetail{
		StudentCategoryCard: card,
		Lessons:             out,
		RequiresAuth:        true,
	}, nil
}
