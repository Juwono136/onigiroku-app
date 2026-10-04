package adminusers

import "time"

const SoftDeleteRetentionDays = 30

type UserStatus string

const (
	StatusActive   UserStatus = "ACTIVE"
	StatusInactive UserStatus = "INACTIVE"
)

type ListScope string

const (
	ScopeActive ListScope = "active"
	ScopeTrash  ListScope = "trash"
)

type ListQuery struct {
	Page     int
	PageSize int
	Search   string
	Role     string
	Status   string
	Scope    ListScope
	SortBy   string
	SortDir  string
}

type UserListItem struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Email         string     `json:"email"`
	EmailVerified bool       `json:"emailVerified"`
	Image         *string    `json:"image"`
	Role          string     `json:"role"`
	Status        UserStatus `json:"status"`
	Locale        string     `json:"locale"`
	CreatedAt     string     `json:"createdAt"`
	UpdatedAt     string     `json:"updatedAt"`
	DeletedAt     *string    `json:"deletedAt"`
	DeletedBy     *string    `json:"deletedBy"`
	LastLoginAt   *string    `json:"lastLoginAt"`
	Providers     []string   `json:"providers"`
}

type UserDetail struct {
	UserListItem
	SessionCount   int     `json:"sessionCount"`
	TrashExpiresAt *string `json:"trashExpiresAt"`
}

type ListResult struct {
	Items      []UserListItem `json:"items"`
	Page       int            `json:"page"`
	PageSize   int            `json:"pageSize"`
	Total      int            `json:"total"`
	TotalPages int            `json:"totalPages"`
}

type UpdatePatch struct {
	Role   *string `json:"role"`
	Status *string `json:"status"`
}

type userRow struct {
	ID            string
	Name          string
	Email         string
	EmailVerified bool
	Image         *string
	Role          string
	Status        string
	Locale        string
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     *time.Time
	DeletedBy     *string
}
