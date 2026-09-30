package config

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port    string
	AppEnv  string
	IsProd  bool
	GinMode string

	DatabaseURL             string
	DatabasePoolMax         int
	DatabasePoolMin         int
	DatabasePoolIdleTimeout time.Duration

	RedisURL string

	CORSOrigins []string

	LogLevel string

	HealthCheckToken string

	StorageEndpoint  string
	StorageBucket    string
	StorageAccessKey string
	StorageSecretKey string

	XenditSecretKey    string
	XenditWebhookToken string
	XenditCallbackURL  string
	XenditPublicKey    string

	InternalAPISecret string

	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration

	RateLimitMax     int
	AuthRateLimitMax int

	AppURL           string
	SalesNotifyEmail string
}

func Load() (*Config, error) {
	loadEnvFiles()

	cfg := &Config{
		Port:             envOr("API_PORT", envOr("PORT", "8080")),
		AppEnv:           resolveAppEnv(),
		GinMode:          envOr("GIN_MODE", "debug"),
		DatabaseURL:      strings.TrimSpace(os.Getenv("DATABASE_URL")),
		RedisURL:         strings.TrimSpace(os.Getenv("REDIS_URL")),
		LogLevel:         envOr("LOG_LEVEL", "info"),
		HealthCheckToken: strings.TrimSpace(os.Getenv("HEALTH_CHECK_TOKEN")),
		StorageEndpoint:  envOr("STORAGE_ENDPOINT", "http://localhost:8333"),
		StorageBucket:    envOr("STORAGE_BUCKET", "onigiroku"),
		StorageAccessKey: strings.TrimSpace(firstNonEmpty(
			os.Getenv("STORAGE_ACCESS_KEY"),
			os.Getenv("USERNAME_STORAGE"),
		)),
		StorageSecretKey: strings.TrimSpace(firstNonEmpty(
			os.Getenv("STORAGE_SECRET_KEY"),
			os.Getenv("PASSWORD_STORAGE"),
		)),
		XenditSecretKey: strings.TrimSpace(os.Getenv("XENDIT_SECRET_KEY")),
		XenditWebhookToken: strings.TrimSpace(firstNonEmpty(
			os.Getenv("XENDIT_CALLBACK_TOKEN"),
			os.Getenv("XENDIT_WEBHOOK_TOKEN"),
		)),
		XenditCallbackURL: strings.TrimSpace(os.Getenv("XENDIT_CALLBACK_URL")),
		XenditPublicKey:   strings.TrimSpace(os.Getenv("XENDIT_PUBLIC_KEY")),
		InternalAPISecret: strings.TrimSpace(os.Getenv("INTERNAL_API_SECRET")),
		AppURL: firstNonEmpty(
			os.Getenv("APP_URL"),
			os.Getenv("NEXT_PUBLIC_APP_URL"),
			"http://localhost:3000",
		),
		SalesNotifyEmail: strings.TrimSpace(os.Getenv("SALES_NOTIFY_EMAIL")),
		RateLimitMax:     envInt("API_RATE_LIMIT_MAX", 300),
		AuthRateLimitMax: envInt("API_AUTH_RATE_LIMIT_MAX", 120),
		DatabasePoolMax:  envInt("DATABASE_POOL_MAX", 10),
		DatabasePoolMin:  envInt("DATABASE_POOL_MIN", 1),
	}

	cfg.IsProd = cfg.AppEnv == "production"
	cfg.CORSOrigins = resolveCORSOrigins()
	cfg.ReadTimeout = envDuration("API_READ_TIMEOUT", 15*time.Second)
	cfg.WriteTimeout = envDuration("API_WRITE_TIMEOUT", 30*time.Second)
	cfg.IdleTimeout = envDuration("API_IDLE_TIMEOUT", 60*time.Second)
	cfg.DatabasePoolIdleTimeout = time.Duration(envInt("DATABASE_POOL_IDLE_TIMEOUT_SEC", 20)) * time.Second

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func loadEnvFiles() {
	// Development source of truth: root `.env` (never `.env.example`).
	// Overload primary so stale process env / leftover `.env.local` cannot win.
	// `.env.local` is optional and only fills keys that are still unset.
	primaries := []string{
		filepath.Join("..", ".env"),
		".env",
	}
	for _, path := range primaries {
		if fileExists(path) {
			_ = godotenv.Overload(path)
			break
		}
	}

	secondaries := []string{
		filepath.Join("..", ".env.local"),
		".env.local",
	}
	for _, path := range secondaries {
		_ = godotenv.Load(path)
	}
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func resolveAppEnv() string {
	if v := strings.TrimSpace(os.Getenv("APP_ENV")); v != "" {
		return strings.ToLower(v)
	}
	if v := strings.TrimSpace(os.Getenv("NODE_ENV")); v != "" {
		return strings.ToLower(v)
	}
	return "development"
}

func resolveCORSOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))
	if raw == "" {
		if app := strings.TrimSpace(firstNonEmpty(
			os.Getenv("NEXT_PUBLIC_APP_URL"),
			os.Getenv("APP_URL"),
		)); app != "" {
			return []string{app}
		}
		return []string{"http://localhost:3000"}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func (c *Config) validate() error {
	if c.Port == "" {
		return fmt.Errorf("API_PORT is required")
	}
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if !strings.HasPrefix(c.DatabaseURL, "postgres://") && !strings.HasPrefix(c.DatabaseURL, "postgresql://") {
		return fmt.Errorf("DATABASE_URL must start with postgres:// or postgresql://")
	}
	if c.RedisURL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}
	if !strings.HasPrefix(c.RedisURL, "redis://") && !strings.HasPrefix(c.RedisURL, "rediss://") {
		return fmt.Errorf("REDIS_URL must start with redis:// or rediss://")
	}
	if c.DatabasePoolMin > c.DatabasePoolMax {
		return fmt.Errorf("DATABASE_POOL_MIN cannot exceed DATABASE_POOL_MAX")
	}
	if c.RateLimitMax < 1 {
		return fmt.Errorf("API_RATE_LIMIT_MAX must be >= 1")
	}

	if c.IsProd {
		if len(c.InternalAPISecret) < 16 || looksLikePlaceholder(c.InternalAPISecret) {
			return fmt.Errorf("INTERNAL_API_SECRET must be a strong non-placeholder value in production")
		}
		if len(c.HealthCheckToken) < 16 || looksLikePlaceholder(c.HealthCheckToken) {
			return fmt.Errorf("HEALTH_CHECK_TOKEN must be set (>=16 chars) in production")
		}
		if strings.ToLower(c.GinMode) != "release" {
			return fmt.Errorf(`GIN_MODE must be "release" in production`)
		}
		if c.LogLevel == "debug" {
			return fmt.Errorf(`LOG_LEVEL must not be "debug" in production`)
		}
		if strings.HasPrefix(c.AppURL, "http://") && !strings.Contains(c.AppURL, "localhost") {
			return fmt.Errorf("APP_URL / NEXT_PUBLIC_APP_URL must use HTTPS in production")
		}
		parsed, err := url.Parse(c.RedisURL)
		if err != nil {
			return fmt.Errorf("REDIS_URL is invalid: %w", err)
		}
		if parsed.User == nil {
			return fmt.Errorf("REDIS_URL must include a password in production")
		}
		if pass, _ := parsed.User.Password(); pass == "" {
			return fmt.Errorf("REDIS_URL must include a password in production")
		}
	}

	return nil
}

func looksLikePlaceholder(value string) bool {
	lower := strings.ToLower(value)
	needles := []string{
		"replace_with", "replace_me", "changeme", "your_", "example",
		"dev_only", "dev_internal", "xxxxx", "<",
	}
	for _, n := range needles {
		if strings.Contains(lower, n) {
			return true
		}
	}
	return false
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}

func envDuration(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	d, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return d
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
