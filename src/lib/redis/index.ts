import Redis from "ioredis";

import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedis() {
  if (globalForRedis.redis) {
    return globalForRedis.redis;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  const isTls = url.startsWith("rediss://");

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10_000,
    ...(isTls
      ? {
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === "production",
          },
        }
      : {}),
  });

  client.on("error", (error) => {
    logger.error("Redis client error", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = client;
  }

  return client;
}

export async function withRedisLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const redis = getRedis();
  if (redis.status !== "ready") {
    await redis.connect();
  }

  const lockKey = `lock:${key}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await redis.set(lockKey, token, "PX", ttlMs, "NX");

  if (acquired !== "OK") {
    return null;
  }

  try {
    return await fn();
  } finally {
    const current = await redis.get(lockKey);
    if (current === token) {
      await redis.del(lockKey);
    }
  }
}
