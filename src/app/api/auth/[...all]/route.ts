import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { mapAuthError } from "@/lib/auth/errors";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

function resolveAppOrigin() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Browser navigations to OAuth callbacks must never land on raw JSON.
 * Better Auth redirects when APIError.body.code is set; this is a safety net
 * for any remaining message-only FORBIDDEN responses.
 */
async function redirectBrowserAuthJsonError(
  request: Request,
  response: Response,
): Promise<Response> {
  const accept = request.headers.get("accept") ?? "";
  const isBrowserNavigation = accept.includes("text/html");
  if (!isBrowserNavigation) return response;

  if (response.status < 400 || response.status >= 500) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const url = new URL(request.url);
  const isOAuthCallback = url.pathname.includes("/api/auth/callback/");
  if (!isOAuthCallback) return response;

  try {
    const payload = (await response.clone().json()) as {
      code?: string;
      message?: string;
    };
    const raw = payload.code ?? payload.message;
    if (!raw || typeof raw !== "string") return response;

    const code = mapAuthError(raw);
    const loginUrl = new URL(`${resolveAppOrigin()}/login`);
    loginUrl.searchParams.set("error", code);
    return NextResponse.redirect(loginUrl);
  } catch {
    return response;
  }
}

export async function GET(request: Request) {
  const response = await handler.GET(request);
  return redirectBrowserAuthJsonError(request, response);
}

export async function POST(request: Request) {
  return handler.POST(request);
}
