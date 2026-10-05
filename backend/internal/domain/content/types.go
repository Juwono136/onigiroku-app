package content

import "time"

const MaxTagsPerMaterial = 5

type Visibility string
type Status string

const (
	VisibilityStudent Visibility = "STUDENT"
	VisibilityPublic  Visibility = "PUBLIC"

	StatusDraft     Status = "DRAFT"
	StatusPublished Status = "PUBLISHED"
	StatusArchived  Status = "ARCHIVED"
)

type TagDTO struct {
	ID         string `json:"id"`
	Slug       string `json:"slug"`
	NameID     string `json:"nameId"`
	NameEN     string `json:"nameEn"`
	UsageCount int    `json:"usageCount"`
}

type LocaleDTO struct {
	Locale   string `json:"locale"`
	Title    string `json:"title"`
	Excerpt  string `json:"excerpt"`
	Body     any    `json:"body"`
	BodyText string `json:"bodyText,omitempty"`
}

type MaterialListItem struct {
	ID             string    `json:"id"`
	Slug           string    `json:"slug"`
	Visibility     string    `json:"visibility"`
	Status         string    `json:"status"`
	Featured       bool      `json:"featured"`
	CoverObjectKey *string   `json:"coverObjectKey"`
	CoverURL       *string   `json:"coverUrl"`
	AuthorID       string    `json:"authorId"`
	PublishedAt    *string   `json:"publishedAt"`
	CreatedAt      string    `json:"createdAt"`
	UpdatedAt      string    `json:"updatedAt"`
	Title          string    `json:"title"`
	Excerpt        string    `json:"excerpt"`
	Tags           []TagDTO  `json:"tags"`
}

type MaterialDetail struct {
	MaterialListItem
	Locales []LocaleDTO `json:"locales"`
}

type ListResult struct {
	Items      []MaterialListItem `json:"items"`
	Page       int                `json:"page"`
	PageSize   int                `json:"pageSize"`
	Total      int                `json:"total"`
	TotalPages int                `json:"totalPages"`
}

type ListQuery struct {
	Page       int
	PageSize   int
	Search     string
	Visibility string // ALL | STUDENT | PUBLIC
	Status     string // ALL | DRAFT | PUBLISHED | ARCHIVED
	TagSlug    string   // legacy single tag (still accepted)
	TagSlugs   []string // multi-tag filter (OR match); max 12
	Featured   *bool
	Locale     string // preferred title locale
	SortBy     string
	SortDir    string
	// Scope filters for public/student surfaces
	RequirePublicPublished  bool
	RequireStudentPublished bool
	IncludeDeleted          bool
}

type LocaleInput struct {
	Locale  string `json:"locale"`
	Title   string `json:"title"`
	Excerpt string `json:"excerpt"`
	Body    any    `json:"body"`
}

type TagInput struct {
	NameID string `json:"nameId"`
	NameEN string `json:"nameEn"`
	Slug   string `json:"slug"` // optional; normalized server-side
}

type UpsertInput struct {
	Visibility     string        `json:"visibility"`
	Status         string        `json:"status"`
	Featured       *bool         `json:"featured"`
	CoverObjectKey *string       `json:"coverObjectKey"`
	Locales        []LocaleInput `json:"locales"`
	Tags           []TagInput    `json:"tags"`
}

type materialRow struct {
	ID             string
	Slug           string
	Visibility     string
	Status         string
	Featured       bool
	CoverObjectKey *string
	AuthorID       string
	PublishedAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}
