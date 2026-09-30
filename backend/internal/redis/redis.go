package redis

import (
	"context"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

func NewClient(redisURL string) (*goredis.Client, error) {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := goredis.NewClient(opts)
	return client, nil
}

func Ping(ctx context.Context, client *goredis.Client) error {
	if client == nil {
		return nil
	}
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return client.Ping(pingCtx).Err()
}
