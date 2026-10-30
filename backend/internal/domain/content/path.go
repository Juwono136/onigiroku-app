package content

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"math/big"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/text/unicode/norm"

	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

const maxQuestionsPerLesson = 30

type QuestionOptionInput struct {
	LabelID  string `json:"labelId"`
	LabelEN  string `json:"labelEn"`
	Correct  bool   `json:"correct"`
}

type QuestionInput struct {
	Type           string                `json:"type"`
	PromptID       string                `json:"promptId"`
	PromptEN       string                `json:"promptEn"`
	ExplanationID  string                `json:"explanationId"`
	ExplanationEN  string                `json:"explanationEn"`
	AcceptedAnswers []string             `json:"acceptedAnswers"`
	AnswerID       string                `json:"answerId"`
	AnswerEN       string                `json:"answerEn"`
	Options        []QuestionOptionInput `json:"options"`
}

type QuestionOptionAdmin struct {
	ID      string `json:"id"`
	LabelID string `json:"labelId"`
	LabelEN string `json:"labelEn"`
	Correct bool   `json:"correct"`
}

type QuestionAdminDTO struct {
	ID             string                `json:"id"`
	Type           string                `json:"type"`
	Position       int                   `json:"position"`
	PromptID       string                `json:"promptId"`
	PromptEN       string                `json:"promptEn"`
	ExplanationID  string                `json:"explanationId"`
	ExplanationEN  string                `json:"explanationEn"`
	AcceptedAnswers []string             `json:"acceptedAnswers"`
	AnswerID       string                `json:"answerId"`
	AnswerEN       string                `json:"answerEn"`
	Options        []QuestionOptionAdmin `json:"options"`
}

type QuestionOptionPublic struct {
	ID      string `json:"id"`
	LabelID string `json:"labelId"`
	LabelEN string `json:"labelEn"`
}

type QuestionPublicDTO struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Position int                    `json:"position"`
	PromptID string                 `json:"promptId"`
	PromptEN string                 `json:"promptEn"`
	Options  []QuestionOptionPublic `json:"options"`
	// Flashcard backs are shown when the student flips the card. Choice keys and
	// accepted short answers stay off this payload until the attempt is graded.
	AnswerID string `json:"answerId,omitempty"`
	AnswerEN string `json:"answerEn,omitempty"`
}

type QuestionReviewDTO struct {
	QuestionPublicDTO
	ExplanationID    string   `json:"explanationId"`
	ExplanationEN    string   `json:"explanationEn"`
	AnswerID         string   `json:"answerId,omitempty"`
	AnswerEN         string   `json:"answerEn,omitempty"`
	AcceptedAnswers  []string `json:"acceptedAnswers,omitempty"`
	CorrectOptionID  string   `json:"correctOptionId,omitempty"`
	Correct          bool     `json:"correct"`
	SelectedOptionID string   `json:"selectedOptionId,omitempty"`
	TextAnswer       string   `json:"textAnswer,omitempty"`
	Knew             *bool    `json:"knew,omitempty"`
}

type CategoryInput struct {
	NameID         string     `json:"nameId"`
	NameEN         string     `json:"nameEn"`
	DescriptionID  string     `json:"descriptionId"`
	DescriptionEN  string     `json:"descriptionEn"`
	CoverObjectKey *string    `json:"coverObjectKey"`
	Status         string     `json:"status"`
	PlanKey        string     `json:"planKey"`
	Tags           []TagInput `json:"tags"`
}

type CategoryDTO struct {
	ID                string   `json:"id"`
	Slug              string   `json:"slug"`
	NameID            string   `json:"nameId"`
	NameEN            string   `json:"nameEn"`
	DescriptionID     string   `json:"descriptionId"`
	DescriptionEN     string   `json:"descriptionEn"`
	CoverObjectKey    *string  `json:"coverObjectKey"`
	CoverURL          *string  `json:"coverUrl"`
	Position          int      `json:"position"`
	Status            string   `json:"status"`
	PlanKey           string   `json:"planKey"`
	LessonCount       int      `json:"lessonCount"`
	CompletedCount    int      `json:"completedCount,omitempty"`
	StudentViewCount  int      `json:"studentViewCount"`
	Tags              []TagDTO `json:"tags"`
	CreatedAt         string   `json:"createdAt"`
	UpdatedAt         string   `json:"updatedAt"`
}

type CategoryListResult struct {
	Items      []CategoryDTO `json:"items"`
	Page       int           `json:"page"`
	PageSize   int           `json:"pageSize"`
	Total      int           `json:"total"`
	TotalPages int           `json:"totalPages"`
}

type PathLessonDTO struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Excerpt     string `json:"excerpt"`
	Position    int    `json:"position"`
	Status      string `json:"status"`
	CoverURL    *string `json:"coverUrl"`
	Locked      bool   `json:"locked"`
	Completed   bool   `json:"completed"`
	InProgress  bool   `json:"inProgress"`
	ReadingPercent int `json:"readingPercent"`
}

type StudentCategoryCard struct {
	ID               string   `json:"id"`
	Slug             string   `json:"slug"`
	NameID           string   `json:"nameId"`
	NameEN           string   `json:"nameEn"`
	DescriptionID    string   `json:"descriptionId"`
	DescriptionEN    string   `json:"descriptionEn"`
	CoverURL         *string  `json:"coverUrl"`
	PlanKey          string   `json:"planKey"`
	LessonCount      int      `json:"lessonCount"`
	CompletedCount   int      `json:"completedCount"`
	StudentViewCount int      `json:"studentViewCount"`
	Tags             []TagDTO `json:"tags"`
}

// PublicCourseLesson is a lesson teaser on a public course page (no lesson body).
type PublicCourseLesson struct {
	Slug     string  `json:"slug"`
	Title    string  `json:"title"`
	Excerpt  string  `json:"excerpt"`
	Position int     `json:"position"`
	CoverURL *string `json:"coverUrl"`
	Locked   bool    `json:"locked"`
}

// PublicCourseDetail is the public catalog detail for one published learning path.
type PublicCourseDetail struct {
	StudentCategoryCard
	Lessons      []PublicCourseLesson `json:"lessons"`
	RequiresAuth bool                 `json:"requiresAuth"`
}

type StudentCategoryDetail struct {
	StudentCategoryCard
	Lessons       []PathLessonDTO    `json:"lessons"`
	PathCompleted bool               `json:"pathCompleted"`
	Completion    *PathCompletionDTO `json:"completion,omitempty"`
}

// QuizAttemptSummary is one practice try for the history list (no answer keys).
type QuizAttemptSummary struct {
	ID            string `json:"id"`
	Score         int    `json:"score"`
	Passed        bool   `json:"passed"`
	CreatedAt     string `json:"createdAt"`
	AttemptNumber int    `json:"attemptNumber"`
}

type QuizAttemptListResult struct {
	Items      []QuizAttemptSummary `json:"items"`
	Total      int                  `json:"total"`
	LatestOnly bool                 `json:"latestOnly"` // progress/unlock still uses newest score
}

// QuizAttemptDetail is one historical attempt with full per-question review.
type QuizAttemptDetail struct {
	QuizAttemptSummary
	PassScore int                 `json:"passScore"`
	Reviews   []QuestionReviewDTO `json:"reviews"`
}

// PathLessonScoreDTO is the latest practice outcome for one lesson in a finished path.
type PathLessonScoreDTO struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	Position      int    `json:"position"`
	Completed     bool   `json:"completed"`
	HasQuestions  bool   `json:"hasQuestions"`
	PassScore     int    `json:"passScore"`
	LatestScore   *int   `json:"latestScore"`
	Passed        bool   `json:"passed"`
	AttemptCount  int    `json:"attemptCount"`
	ReadingOnly   bool   `json:"readingOnly"`
}

type NextPathCardDTO struct {
	Slug           string  `json:"slug"`
	NameID         string  `json:"nameId"`
	NameEN         string  `json:"nameEn"`
	CoverURL       *string `json:"coverUrl"`
	LessonCount    int     `json:"lessonCount"`
	CompletedCount int     `json:"completedCount"`
	PlanKey        string  `json:"planKey"`
}

type PathCompletionDTO struct {
	CategorySlug   string               `json:"categorySlug"`
	CategoryNameID string               `json:"categoryNameId"`
	CategoryNameEN string               `json:"categoryNameEn"`
	LessonCount    int                  `json:"lessonCount"`
	CompletedCount int                  `json:"completedCount"`
	AverageScore   *float64             `json:"averageScore"`
	Lessons        []PathLessonScoreDTO `json:"lessons"`
	NextPath       *NextPathCardDTO     `json:"nextPath"`
}

type LessonProgressDTO struct {
	Status         string `json:"status"`
	ReadingPercent int    `json:"readingPercent"`
	Completed      bool   `json:"completed"`
}

type StudentLessonView struct {
	Material       *MaterialDetail     `json:"material"`
	CategorySlug   string              `json:"categorySlug"`
	CategoryNameID string              `json:"categoryNameId"`
	CategoryNameEN string              `json:"categoryNameEn"`
	CompletedCount int                 `json:"completedCount"`
	LessonCount    int                 `json:"lessonCount"`
	Progress       LessonProgressDTO   `json:"progress"`
	Questions      []QuestionPublicDTO `json:"questions"`
	Lessons        []PathLessonDTO     `json:"lessons"`
	NextSlug       *string             `json:"nextSlug"`
	NextLocked     bool                `json:"nextLocked"`
	PathCompleted  bool                `json:"pathCompleted"`
	Completion     *PathCompletionDTO  `json:"completion,omitempty"`
}

type QuizAnswerInput struct {
	QuestionID       string `json:"questionId"`
	SelectedOptionID string `json:"selectedOptionId"`
	TextAnswer       string `json:"textAnswer"`
	Knew             *bool  `json:"knew"`
}

type QuizSubmitInput struct {
	AttemptID string            `json:"attemptId"`
	Answers   []QuizAnswerInput `json:"answers"`
}

type QuizSubmitResult struct {
	AttemptID     string              `json:"attemptId"`
	Score         int                 `json:"score"`
	Passed        bool                `json:"passed"`
	PassScore     int                 `json:"passScore"`
	Reviews       []QuestionReviewDTO `json:"reviews"`
	NextSlug      *string             `json:"nextSlug"`
	NextLocked    bool                `json:"nextLocked"`
	PathCompleted bool                `json:"pathCompleted"`
	Completion    *PathCompletionDTO  `json:"completion,omitempty"`
}

func paywallEnabled() bool {
	v := strings.TrimSpace(os.Getenv("LEARNING_PAYWALL_ENABLED"))
	return strings.EqualFold(v, "true") || v == "1"
}

func clampPassScore(v int) int {
	if v < 50 {
		return 50
	}
	if v > 100 {
		return 100
	}
	return v
}

func normalizeAnswerText(raw string) string {
	s := strings.TrimSpace(strings.ToLower(norm.NFKC.String(raw)))
	s = strings.Join(strings.Fields(s), " ")
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		// Fold katakana into hiragana so カタカナ and かたがな match.
		if r >= 'ァ' && r <= 'ヶ' {
			b.WriteRune(r - 0x60)
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func (s *Service) applyLessonPath(ctx context.Context, tx pgx.Tx, materialID string, vis Visibility, in UpsertInput) error {
	pass := 80
	if in.PassScore != nil {
		pass = clampPassScore(*in.PassScore)
	}
	shuffleQ := false
	if in.ShuffleQuestions != nil {
		shuffleQ = *in.ShuffleQuestions
	}
	shuffleC := false
	if in.ShuffleChoices != nil {
		shuffleC = *in.ShuffleChoices
	}

	if vis != VisibilityStudent {
		if _, err := tx.Exec(ctx, `
			UPDATE learning_material
			SET category_id = NULL, position = NULL, pass_score = $2,
			    shuffle_questions = false, shuffle_choices = false, updated_at = NOW()
			WHERE id = $1
		`, materialID, pass); err != nil {
			return apperrors.Internal(err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM learning_question WHERE material_id = $1`, materialID); err != nil {
			return apperrors.Internal(err)
		}
		return nil
	}

	var categoryID *string
	if in.CategoryID != nil {
		trimmed := strings.TrimSpace(*in.CategoryID)
		if trimmed != "" {
			categoryID = &trimmed
		}
	}

	var position *int
	if categoryID != nil {
		var exists string
		err := tx.QueryRow(ctx, `
			SELECT id FROM learning_category
			WHERE id = $1 AND deleted_at IS NULL
			FOR UPDATE
		`, *categoryID).Scan(&exists)
		if err == pgx.ErrNoRows {
			return apperrors.Validation("Category not found", "Kategori tidak ditemukan")
		}
		if err != nil {
			return apperrors.Internal(err)
		}

		if in.Position != nil && *in.Position > 0 {
			p := *in.Position
			var other string
			err = tx.QueryRow(ctx, `
				SELECT id FROM learning_material
				WHERE category_id = $1 AND position = $2 AND deleted_at IS NULL AND id <> $3
				LIMIT 1
			`, *categoryID, p, materialID).Scan(&other)
			if err != nil && err != pgx.ErrNoRows {
				return apperrors.Internal(err)
			}
			if err == nil {
				return apperrors.Validation("Position already used in this category", "Urutan sudah dipakai di kategori ini")
			}
			position = &p
		} else {
			var current *int
			_ = tx.QueryRow(ctx, `
				SELECT position FROM learning_material WHERE id = $1 AND category_id = $2
			`, materialID, *categoryID).Scan(&current)
			if current != nil && *current > 0 {
				position = current
			} else {
				var next int
				if err := tx.QueryRow(ctx, `
					SELECT COALESCE(MAX(position), 0) + 1
					FROM learning_material
					WHERE category_id = $1 AND deleted_at IS NULL
				`, *categoryID).Scan(&next); err != nil {
					return apperrors.Internal(err)
				}
				position = &next
			}
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE learning_material
		SET category_id = $2, position = $3, pass_score = $4,
		    shuffle_questions = $5, shuffle_choices = $6, updated_at = NOW()
		WHERE id = $1
	`, materialID, categoryID, position, pass, shuffleQ, shuffleC); err != nil {
		return apperrors.Internal(err)
	}

	if in.Questions != nil {
		if err := s.replaceQuestions(ctx, tx, materialID, *in.Questions); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) replaceQuestions(ctx context.Context, tx pgx.Tx, materialID string, questions []QuestionInput) error {
	if len(questions) > maxQuestionsPerLesson {
		return apperrors.Validation("Too many questions", "Terlalu banyak soal")
	}
	if _, err := tx.Exec(ctx, `DELETE FROM learning_question WHERE material_id = $1`, materialID); err != nil {
		return apperrors.Internal(err)
	}
	for i, q := range questions {
		normalized, err := normalizeQuestion(q, i+1)
		if err != nil {
			return err
		}
		qid := uuid.NewString()
		answers, _ := json.Marshal(normalized.AcceptedAnswers)
		if _, err := tx.Exec(ctx, `
			INSERT INTO learning_question (
			  id, material_id, type, position, prompt_id, prompt_en,
			  explanation_id, explanation_en, accepted_answers, answer_id, answer_en,
			  created_at, updated_at
			) VALUES ($1,$2,$3::learning_question_type,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,NOW(),NOW())
		`, qid, materialID, normalized.Type, i+1, normalized.PromptID, normalized.PromptEN,
			normalized.ExplanationID, normalized.ExplanationEN, answers, normalized.AnswerID, normalized.AnswerEN); err != nil {
			return apperrors.Internal(err)
		}
		for oi, opt := range normalized.Options {
			if _, err := tx.Exec(ctx, `
				INSERT INTO learning_question_option (id, question_id, position, label_id, label_en, is_correct)
				VALUES ($1,$2,$3,$4,$5,$6)
			`, uuid.NewString(), qid, oi+1, opt.LabelID, opt.LabelEN, opt.Correct); err != nil {
				return apperrors.Internal(err)
			}
		}
	}
	return nil
}

func firstText(a, b string) string {
	if strings.TrimSpace(a) != "" {
		return a
	}
	return b
}

// normalizeRichField stores plain text or sanitized TipTap JSON.
// plainMax counts visible characters. The stored payload is capped to limit abuse.
func normalizeRichField(raw string, plainMax int) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	if len(raw) > 20000 {
		return "", apperrors.Validation("Text is too long", "Teks terlalu panjang")
	}
	if !strings.HasPrefix(raw, "{") {
		if len([]rune(raw)) > plainMax {
			return "", apperrors.Validation("Text is too long", "Teks terlalu panjang")
		}
		return raw, nil
	}
	var node map[string]any
	if err := json.Unmarshal([]byte(raw), &node); err != nil {
		if len([]rune(raw)) > plainMax {
			return "", apperrors.Validation("Text is too long", "Teks terlalu panjang")
		}
		return raw, nil
	}
	clean, _ := sanitizeBody(node).(map[string]any)
	if clean == nil {
		return "", nil
	}
	parts := make([]string, 0)
	walkTipTapText(clean, &parts)
	plain := strings.Join(parts, " ")
	if len([]rune(plain)) > plainMax {
		return "", apperrors.Validation("Text is too long", "Teks terlalu panjang")
	}
	if strings.TrimSpace(plain) == "" {
		return "", nil
	}
	encoded, err := json.Marshal(clean)
	if err != nil {
		return "", apperrors.Validation("Text could not be saved", "Teks tidak dapat disimpan")
	}
	return string(encoded), nil
}

func normalizeQuestion(q QuestionInput, position int) (QuestionInput, error) {
	q.Type = strings.TrimSpace(q.Type)
	prompt, err := normalizeRichField(firstText(q.PromptID, q.PromptEN), 800)
	if err != nil {
		return q, err
	}
	explain, err := normalizeRichField(firstText(q.ExplanationID, q.ExplanationEN), 2000)
	if err != nil {
		return q, err
	}
	answer, err := normalizeRichField(firstText(q.AnswerID, q.AnswerEN), 800)
	if err != nil {
		return q, err
	}
	q.PromptID, q.PromptEN = prompt, prompt
	q.ExplanationID, q.ExplanationEN = explain, explain
	q.AnswerID, q.AnswerEN = answer, answer
	if q.PromptID == "" {
		return q, apperrors.Validation("Question prompt is required", "Pertanyaan wajib diisi")
	}
	switch q.Type {
	case "multiple_choice":
		if len(q.Options) < 2 || len(q.Options) > 6 {
			return q, apperrors.Validation("Multiple choice needs 2–6 options", "Pilihan ganda butuh 2–6 opsi")
		}
		correct := 0
		for i := range q.Options {
			q.Options[i].LabelID = strings.TrimSpace(q.Options[i].LabelID)
			q.Options[i].LabelEN = strings.TrimSpace(q.Options[i].LabelEN)
			if q.Options[i].LabelID == "" {
				q.Options[i].LabelID = q.Options[i].LabelEN
			}
			if q.Options[i].LabelEN == "" {
				q.Options[i].LabelEN = q.Options[i].LabelID
			}
			if q.Options[i].LabelID == "" {
				return q, apperrors.Validation("Option label is required", "Label opsi wajib diisi")
			}
			if q.Options[i].Correct {
				correct++
			}
		}
		if correct != 1 {
			return q, apperrors.Validation("Choose exactly one correct option", "Pilih tepat satu jawaban benar")
		}
		q.AcceptedAnswers = nil
	case "short_answer":
		clean := make([]string, 0, len(q.AcceptedAnswers))
		seen := map[string]struct{}{}
		for _, raw := range q.AcceptedAnswers {
			n := normalizeAnswerText(raw)
			if n == "" {
				continue
			}
			if _, ok := seen[n]; ok {
				continue
			}
			seen[n] = struct{}{}
			clean = append(clean, strings.TrimSpace(raw))
		}
		if len(clean) == 0 {
			return q, apperrors.Validation("Short answer needs at least one accepted answer", "Isian singkat butuh minimal satu jawaban")
		}
		q.AcceptedAnswers = clean
		q.Options = nil
	case "flashcard":
		if q.AnswerID == "" && q.AnswerEN == "" {
			return q, apperrors.Validation("Flashcard needs a back side", "Kartu kuis butuh sisi jawaban")
		}
		if q.AnswerID == "" {
			q.AnswerID = q.AnswerEN
		}
		if q.AnswerEN == "" {
			q.AnswerEN = q.AnswerID
		}
		q.Options = nil
		q.AcceptedAnswers = nil
	default:
		return q, apperrors.Validation("Unknown question type", "Jenis soal tidak dikenal")
	}
	_ = position
	return q, nil
}

func (s *Service) loadQuestions(ctx context.Context, materialID string, withSecrets bool) ([]QuestionAdminDTO, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, type::text, position, prompt_id, prompt_en, explanation_id, explanation_en,
		       accepted_answers, answer_id, answer_en
		FROM learning_question
		WHERE material_id = $1
		ORDER BY position ASC
	`, materialID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := make([]QuestionAdminDTO, 0)
	ids := make([]string, 0)
	for rows.Next() {
		var q QuestionAdminDTO
		var answersRaw []byte
		if err := rows.Scan(
			&q.ID, &q.Type, &q.Position, &q.PromptID, &q.PromptEN, &q.ExplanationID, &q.ExplanationEN,
			&answersRaw, &q.AnswerID, &q.AnswerEN,
		); err != nil {
			return nil, apperrors.Internal(err)
		}
		_ = json.Unmarshal(answersRaw, &q.AcceptedAnswers)
		if q.AcceptedAnswers == nil {
			q.AcceptedAnswers = []string{}
		}
		if !withSecrets {
			q.AcceptedAnswers = []string{}
			q.AnswerID = ""
			q.AnswerEN = ""
			q.ExplanationID = ""
			q.ExplanationEN = ""
		}
		q.Options = []QuestionOptionAdmin{}
		out = append(out, q)
		ids = append(ids, q.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}
	if len(ids) == 0 {
		return out, nil
	}
	optRows, err := s.Pool.Query(ctx, `
		SELECT id, question_id, label_id, label_en, is_correct
		FROM learning_question_option
		WHERE question_id = ANY($1::text[])
		ORDER BY position ASC
	`, ids)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer optRows.Close()
	byQ := map[string][]QuestionOptionAdmin{}
	for optRows.Next() {
		var qid string
		var opt QuestionOptionAdmin
		if err := optRows.Scan(&opt.ID, &qid, &opt.LabelID, &opt.LabelEN, &opt.Correct); err != nil {
			return nil, apperrors.Internal(err)
		}
		if !withSecrets {
			opt.Correct = false
		}
		byQ[qid] = append(byQ[qid], opt)
	}
	for i := range out {
		if opts := byQ[out[i].ID]; opts != nil {
			out[i].Options = opts
		}
	}
	return out, optRows.Err()
}

func toPublicQuestions(admin []QuestionAdminDTO) []QuestionPublicDTO {
	out := make([]QuestionPublicDTO, 0, len(admin))
	for _, q := range admin {
		opts := make([]QuestionOptionPublic, 0, len(q.Options))
		for _, o := range q.Options {
			opts = append(opts, QuestionOptionPublic{ID: o.ID, LabelID: o.LabelID, LabelEN: o.LabelEN})
		}
		pub := QuestionPublicDTO{
			ID: q.ID, Type: q.Type, Position: q.Position,
			PromptID: q.PromptID, PromptEN: q.PromptEN, Options: opts,
		}
		if q.Type == "flashcard" {
			pub.AnswerID = q.AnswerID
			pub.AnswerEN = q.AnswerEN
		}
		out = append(out, pub)
	}
	return out
}

func shufflePublicPractice(questions []QuestionPublicDTO, shuffleQuestions, shuffleChoices bool) []QuestionPublicDTO {
	out := make([]QuestionPublicDTO, len(questions))
	copy(out, questions)
	if shuffleChoices {
		for i := range out {
			if out[i].Type != "multiple_choice" || len(out[i].Options) < 2 {
				continue
			}
			opts := make([]QuestionOptionPublic, len(out[i].Options))
			copy(opts, out[i].Options)
			cryptoShuffle(len(opts), func(a, b int) { opts[a], opts[b] = opts[b], opts[a] })
			out[i].Options = opts
		}
	}
	if shuffleQuestions && len(out) > 1 {
		cryptoShuffle(len(out), func(a, b int) { out[a], out[b] = out[b], out[a] })
	}
	return out
}

func cryptoShuffle(n int, swap func(i, j int)) {
	for i := n - 1; i > 0; i-- {
		jBig, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		j := i
		if err == nil {
			j = int(jBig.Int64())
		}
		swap(i, j)
	}
}

type pathLessonRow struct {
	ID         string
	Slug       string
	Title      string
	Excerpt    string
	Position   int
	Status     string
	CoverKey   *string
	QuestionN  int
}

func (s *Service) publishedLessons(ctx context.Context, categoryID, locale string) ([]pathLessonRow, error) {
	if locale != "en" {
		locale = "id"
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT m.id, m.slug, COALESCE(loc.title, loc2.title, ''), COALESCE(loc.excerpt, loc2.excerpt, ''),
		       COALESCE(m.position, 0), m.status::text, m.cover_object_key,
		       (SELECT COUNT(*)::int FROM learning_question q WHERE q.material_id = m.id)
		FROM learning_material m
		LEFT JOIN learning_material_locale loc ON loc.material_id = m.id AND loc.locale = $2
		LEFT JOIN learning_material_locale loc2 ON loc2.material_id = m.id AND loc2.locale = CASE WHEN $2 = 'en' THEN 'id' ELSE 'en' END
		WHERE m.category_id = $1
		  AND m.deleted_at IS NULL
		  AND m.visibility = 'STUDENT'
		  AND m.status = 'PUBLISHED'
		ORDER BY m.position ASC, m.created_at ASC
	`, categoryID, locale)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := make([]pathLessonRow, 0)
	for rows.Next() {
		var r pathLessonRow
		if err := rows.Scan(&r.ID, &r.Slug, &r.Title, &r.Excerpt, &r.Position, &r.Status, &r.CoverKey, &r.QuestionN); err != nil {
			return nil, apperrors.Internal(err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Service) completedSet(ctx context.Context, userID string, lessons []pathLessonRow) (map[string]bool, map[string]int, error) {
	done := map[string]bool{}
	reading := map[string]int{}
	if userID == "" || len(lessons) == 0 {
		return done, reading, nil
	}
	ids := make([]string, len(lessons))
	for i, l := range lessons {
		ids[i] = l.ID
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT material_id, status::text, reading_percent
		FROM learning_lesson_progress
		WHERE user_id = $1 AND material_id = ANY($2::text[])
	`, userID, ids)
	if err != nil {
		return nil, nil, apperrors.Internal(err)
	}
	defer rows.Close()
	status := map[string]string{}
	for rows.Next() {
		var id, st string
		var pct int
		if err := rows.Scan(&id, &st, &pct); err != nil {
			return nil, nil, apperrors.Internal(err)
		}
		status[id] = st
		reading[id] = pct
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	for _, l := range lessons {
		if l.QuestionN == 0 {
			if _, opened := status[l.ID]; opened {
				done[l.ID] = true
			}
			continue
		}
		if status[l.ID] == "completed" {
			done[l.ID] = true
		}
	}
	return done, reading, nil
}

func lessonUnlocked(lessons []pathLessonRow, done map[string]bool, materialID string) bool {
	for _, l := range lessons {
		if l.ID == materialID {
			return true
		}
		if !done[l.ID] {
			return false
		}
	}
	return false
}

func (s *Service) userHasPlan(ctx context.Context, userID, planKey string) (bool, error) {
	if !paywallEnabled() || planKey == "" || planKey == "free" {
		return true, nil
	}
	var n int
	err := s.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM user_learning_access
		WHERE user_id = $1 AND plan_key = $2 AND status = 'active'
		  AND (starts_at IS NULL OR starts_at <= NOW())
		  AND (ends_at IS NULL OR ends_at > NOW())
	`, userID, planKey).Scan(&n)
	if err != nil {
		return false, apperrors.Internal(err)
	}
	return n > 0, nil
}

func (s *Service) assertCategoryAccess(ctx context.Context, userID, planKey string) error {
	ok, err := s.userHasPlan(ctx, userID, planKey)
	if err != nil {
		return err
	}
	if !ok {
		return apperrors.Forbidden()
	}
	return nil
}
