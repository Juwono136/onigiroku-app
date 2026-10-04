/**
 * Origin / Referer checks for cookie-authenticated mutating BFF routes (OWASP CSRF).
 */

function allowedOrigins(): string[] {
  const values = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.APP_URL,
  ]
    .filter(Boolean)
    .map((v) => {
      try {
        return new URL(v as string).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  return Array.from(new Set(values));
}

export function assertTrustedMutationOrigin(request: Request): boolean {
  const allowed = allowedOrigins();
  if (allowed.length === 0) {
    // Misconfigured env — fail closed for mutations outside development.
    return process.env.NODE_ENV !== "production";
  }

  const origin = request.headers.get("origin");
  if (origin && allowed.includes(origin)) return true;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.includes(refOrigin)) return true;
    } catch {
      // ignore
    }
  }

  // Same-origin navigations / some clients omit Origin on GET; for mutations
  // both missing is suspicious in browsers — allow only in development.
  if (!origin && !referer) {
    return process.env.NODE_ENV !== "production";
  }

  return false;
}
