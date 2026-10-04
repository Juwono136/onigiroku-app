import { logger } from "@/lib/logger";
import { getApiBaseUrl } from "@/lib/env";

export type GoApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Abort after this many ms (default 15s). */
  timeoutMs?: number;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    messageId?: string;
  };
  meta?: {
    requestId?: string;
  };
};

export type GoActorContext = {
  userId: string;
  role?: string;
  /** Used by login-history to mark the current session row. */
  currentSessionToken?: string | null;
};

function getBaseUrl() {
  return getApiBaseUrl();
}

function mergeHeaders(
  base: Record<string, string>,
  extra?: HeadersInit,
): Record<string, string> {
  const out = { ...base };
  if (!extra) return out;
  if (extra instanceof Headers) {
    extra.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(extra)) {
    for (const [key, value] of extra) out[key] = value;
    return out;
  }
  for (const [key, value] of Object.entries(extra)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/**
 * Trusted server-to-server call from Next.js BFF to the Go Gin API.
 * Always attaches `X-Internal-Secret` when configured.
 */
export async function callGoApi<T>(
  path: string,
  options: GoApiOptions = {},
): Promise<ApiEnvelope<T>> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  const timeoutMs = options.timeoutMs ?? 15_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: mergeHeaders(
        {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(secret ? { "X-Internal-Secret": secret } : {}),
        },
        options.headers,
      ),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || !payload.success) {
      logger.warn("Go API request failed", {
        url,
        status: response.status,
        code: payload.error?.code,
        requestId: payload.meta?.requestId,
      });
    }

    return payload;
  } catch (error) {
    logger.error("Go API request error", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: {
        code: "GO_API_UNAVAILABLE",
        message: "Domain API is temporarily unavailable",
      },
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Domain calls that must run as a specific authenticated user (admin/settings).
 */
export async function callGoApiWithActor<T>(
  path: string,
  actor: GoActorContext,
  options: GoApiOptions = {},
): Promise<ApiEnvelope<T>> {
  const actorHeaders: Record<string, string> = {
    "X-Actor-User-Id": actor.userId,
  };
  if (actor.role) actorHeaders["X-Actor-Role"] = actor.role;
  if (actor.currentSessionToken) {
    actorHeaders["X-Current-Session-Token"] = actor.currentSessionToken;
  }

  return callGoApi<T>(path, {
    ...options,
    headers: mergeHeaders(actorHeaders, options.headers),
  });
}

/**
 * Probe Go readiness (`GET /ready`). Used by Next health aggregation.
 */
export async function checkGoReady(): Promise<{
  ok: boolean;
  status: "ok" | "degraded" | "skipped";
  detail?: string;
}> {
  const base = getBaseUrl().replace(/\/$/, "");
  if (!base) {
    return { ok: false, status: "skipped", detail: "API base URL missing" };
  }

  const token = process.env.HEALTH_CHECK_TOKEN?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${base}/ready`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token
          ? {
              "X-Health-Token": token,
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: "degraded",
        detail: `HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { status?: string };
    };
    const ok = Boolean(payload.success);
    return {
      ok,
      status: ok ? "ok" : "degraded",
      detail: payload.data?.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: "degraded",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
