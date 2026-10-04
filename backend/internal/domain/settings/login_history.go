package settings

import (
	"context"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

const historyWindow = 7 * 24 * time.Hour

type LoginHistoryItem struct {
	ID          string  `json:"id"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
	ExpiresAt   string  `json:"expiresAt"`
	IPAddress   *string `json:"ipAddress"`
	IPLabel     string  `json:"ipLabel"`
	IPDetail    *string `json:"ipDetail"`
	IPKind      string  `json:"ipKind"`
	UserAgent   *string `json:"userAgent"`
	DeviceLabel string  `json:"deviceLabel"`
	Browser     string  `json:"browser"`
	OS          string  `json:"os"`
	DeviceType  string  `json:"deviceType"`
	IsCurrent   bool    `json:"isCurrent"`
	IsActive    bool    `json:"isActive"`
}

type LoginHistoryPage struct {
	Items      []LoginHistoryItem `json:"items"`
	Page       int                `json:"page"`
	PageSize   int                `json:"pageSize"`
	Total      int                `json:"total"`
	TotalPages int                `json:"totalPages"`
	WindowDays int                `json:"windowDays"`
}

type LoginHistoryQuery struct {
	UserID              string
	CurrentSessionToken string
	Page                int
	PageSize            int
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

func ListLoginHistory(ctx context.Context, pool *pgxpool.Pool, q LoginHistoryQuery) (*LoginHistoryPage, error) {
	page := normalizePage(q.Page)
	pageSize := normalizePageSize(q.PageSize)
	since := time.Now().UTC().Add(-historyWindow)

	var total int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM session
		WHERE user_id = $1 AND created_at >= $2
	`, q.UserID, since).Scan(&total); err != nil {
		return nil, apperrors.Internal(err)
	}

	totalPages := int(math.Max(1, math.Ceil(float64(total)/float64(pageSize))))
	offset := (page - 1) * pageSize

	rows, err := pool.Query(ctx, `
		SELECT id, token, created_at, updated_at, expires_at, ip_address, user_agent
		FROM session
		WHERE user_id = $1 AND created_at >= $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`, q.UserID, since, pageSize, offset)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	items := make([]LoginHistoryItem, 0, pageSize)
	for rows.Next() {
		var (
			id, token              string
			createdAt, updatedAt   time.Time
			expiresAt              time.Time
			ipAddress, userAgent   *string
		)
		if err := rows.Scan(&id, &token, &createdAt, &updatedAt, &expiresAt, &ipAddress, &userAgent); err != nil {
			return nil, apperrors.Internal(err)
		}
		ua := ""
		if userAgent != nil {
			ua = *userAgent
		}
		device := summarizeUserAgent(ua)
		ip := describeIPAddress(ipAddress)
		items = append(items, LoginHistoryItem{
			ID:          id,
			CreatedAt:   createdAt.UTC().Format(time.RFC3339Nano),
			UpdatedAt:   updatedAt.UTC().Format(time.RFC3339Nano),
			ExpiresAt:   expiresAt.UTC().Format(time.RFC3339Nano),
			IPAddress:   ipAddress,
			IPLabel:     ip.Label,
			IPDetail:    ip.Detail,
			IPKind:      ip.Kind,
			UserAgent:   userAgent,
			DeviceLabel: device.Label,
			Browser:     device.Browser,
			OS:          device.OS,
			DeviceType:  device.DeviceType,
			IsCurrent:   q.CurrentSessionToken != "" && token == q.CurrentSessionToken,
			IsActive:    expiresAt.After(now),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal(err)
	}

	return &LoginHistoryPage{
		Items:      items,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
		WindowDays: 7,
	}, nil
}
