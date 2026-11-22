import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Optional proxy so tunnels can target Next (:3000) while Go verifies
 * DOKU signatures on the raw body. Prefer pointing DOKU at the Go API
 * directly in production.
 */
export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  const base = getApiBaseUrl().replace(/\/$/, "");
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  try {
    const upstream = await fetch(`${base}/api/billing/webhooks/doku`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        Accept: "application/json",
        "Request-Id": request.headers.get("request-id") ?? "",
        "Request-Timestamp": request.headers.get("request-timestamp") ?? "",
        Signature: request.headers.get("signature") ?? "",
        ...(secret ? { "X-Internal-Secret": secret } : {}),
      },
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    logger.error("DOKU webhook proxy failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: { code: "WEBHOOK_PROXY_FAILED", message: "Upstream unavailable" } },
      { status: 502 },
    );
  }
}
