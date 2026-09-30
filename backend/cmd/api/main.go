package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/onigiroku/onigiroku-app/backend/internal/config"
	"github.com/onigiroku/onigiroku-app/backend/internal/database"
	redisclient "github.com/onigiroku/onigiroku-app/backend/internal/redis"
	"github.com/onigiroku/onigiroku-app/backend/internal/server"
	"github.com/onigiroku/onigiroku-app/backend/pkg/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config: %v\n", err)
		os.Exit(1)
	}

	log, err := logger.New(cfg.LogLevel, !cfg.IsProd)
	if err != nil {
		fmt.Fprintf(os.Stderr, "logger: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = log.Sync() }()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := database.NewPostgres(ctx, cfg.DatabaseURL, database.PoolOptions{
		MaxConns:        int32(cfg.DatabasePoolMax),
		MinConns:        int32(cfg.DatabasePoolMin),
		MaxConnIdleTime: cfg.DatabasePoolIdleTimeout,
	})
	if err != nil {
		log.Error("postgres connect failed", zap.Error(err))
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Hint: verify DATABASE_URL in root `.env` (not `.env.example`).")
		fmt.Fprintln(os.Stderr, "SQLSTATE 28P01 usually means the Postgres password does not match.")
		fmt.Fprintln(os.Stderr, "Keep secrets in `.env`; leave `.env.local` free of conflicting credentials.")
		os.Exit(1)
	}
	defer pool.Close()

	rdb, err := redisclient.NewClient(cfg.RedisURL)
	if err != nil {
		log.Fatal("redis connect failed", zap.Error(err))
	}
	defer func() { _ = rdb.Close() }()

	engine := server.NewEngine(server.Dependencies{
		Config: cfg,
		Log:    log,
		Pool:   pool,
		Redis:  rdb,
	})

	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:              addr,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	go func() {
		log.Info("starting api server", zap.String("addr", addr), zap.String("env", cfg.AppEnv))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown error", zap.Error(err))
	}
	log.Info("server stopped")
}
