import { logger } from "@/lib/logger";
import { getApiBaseUrl } from "@/lib/env";

export type GoApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
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

function getBaseUrl() {
  return getApiBaseUrl();
}

/**
 * Trusted server-to-server call from Next.js to the Go Gin API.
 */
export async function callGoApi<T>(
  path: string,
  options: GoApiOptions = {},
): Promise<ApiEnvelope<T>> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const secret = process.env.INTERNAL_API_SECRET;

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(secret ? { "X-Internal-Secret": secret } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
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
  }
}
