package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PoolOptions struct {
	MaxConns        int32
	MinConns        int32
	MaxConnIdleTime time.Duration
}

func NewPostgres(ctx context.Context, databaseURL string, opts PoolOptions) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	if opts.MaxConns > 0 {
		cfg.MaxConns = opts.MaxConns
	} else {
		cfg.MaxConns = 10
	}
	if opts.MinConns >= 0 {
		cfg.MinConns = opts.MinConns
	} else {
		cfg.MinConns = 1
	}
	cfg.MaxConnLifetime = time.Hour
	if opts.MaxConnIdleTime > 0 {
		cfg.MaxConnIdleTime = opts.MaxConnIdleTime
	} else {
		cfg.MaxConnIdleTime = 30 * time.Minute
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return nil
	}
	return pool.Ping(ctx)
}
