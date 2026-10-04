import { NextRequest, NextResponse } from "next/server";

import { checkGoReady } from "@/lib/api/go-client";
import { isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function isAuthorized(request: NextRequest) {
  const token = process.env.HEALTH_CHECK_TOKEN?.trim();

  if (isProduction()) {
    if (!token || token.length < 16) {
      return false;
    }
  } else if (!token) {
    return true;
  }

  const headerToken = request.headers.get("x-health-token")?.trim() ?? "";
  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

  return (
    (headerToken.length > 0 && timingSafeEqual(headerToken, token!)) ||
    (bearer.length > 0 && timingSafeEqual(bearer, token!))
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const checks: Record<string, "ok" | "degraded" | "skipped"> = {
    web: "ok",
    database: "skipped",
    redis: "skipped",
    goApi: "skipped",
  };

  try {
    if (process.env.DATABASE_URL) {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      await db.execute((await import("drizzle-orm")).sql`select 1`);
      checks.database = "ok";
    }
  } catch (error) {
    checks.database = "degraded";
    logger.warn("Health check database degraded", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    if (process.env.REDIS_URL) {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      if (redis.status !== "ready") {
        await redis.connect();
      }
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "degraded";
    }
  } catch (error) {
    checks.redis = "degraded";
    logger.warn("Health check redis degraded", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const go = await checkGoReady();
    checks.goApi = go.status;
    if (!go.ok && go.status === "degraded") {
      logger.warn("Health check Go API degraded", { detail: go.detail });
    }
  } catch (error) {
    checks.goApi = "degraded";
    logger.warn("Health check Go API failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const healthy =
    checks.web === "ok" &&
    checks.database !== "degraded" &&
    checks.redis !== "degraded" &&
    checks.goApi !== "degraded";

  return NextResponse.json(
    {
      success: healthy,
      data: {
        service: "onigiroku-web",
        status: healthy ? "healthy" : "degraded",
        checks,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
