import { NextResponse } from "next/server";

/**
 * Forward Better Auth Set-Cookie headers (session + cookie-cache) onto a
 * Next.js JSON response so profile updates refresh chrome without a hard reload.
 */
export function withAuthCookies(
  response: NextResponse,
  authHeaders: Headers | null | undefined,
): NextResponse {
  if (!authHeaders) return response;

  const fromGetter =
    typeof authHeaders.getSetCookie === "function"
      ? authHeaders.getSetCookie()
      : [];

  if (fromGetter.length > 0) {
    for (const cookie of fromGetter) {
      response.headers.append("set-cookie", cookie);
    }
    return response;
  }

  const raw = authHeaders.get("set-cookie");
  if (raw) {
    for (const part of raw.split(/,(?=[^;]+?=)/)) {
      const cookie = part.trim();
      if (cookie) response.headers.append("set-cookie", cookie);
    }
  }

  return response;
}

export function jsonWithAuthCookies(
  body: unknown,
  authHeaders: Headers | null | undefined,
  init?: { status?: number },
) {
  return withAuthCookies(
    NextResponse.json(body, { status: init?.status ?? 200 }),
    authHeaders,
  );
}
