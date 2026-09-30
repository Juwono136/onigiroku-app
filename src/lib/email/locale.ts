import type { AuthEmailLocale } from "@/lib/email/templates/auth";

export function normalizeAuthEmailLocale(
  value: unknown,
): AuthEmailLocale | null {
  if (value === "en" || value === "id") return value;
  return null;
}

/** Prefer user.locale, then NEXT_LOCALE cookie from the auth request. */
export function resolveEmailLocale(
  user: { locale?: string | null },
  request?: Request | null,
): AuthEmailLocale {
  const fromUser = normalizeAuthEmailLocale(user.locale);
  if (fromUser) return fromUser;

  const cookie = request?.headers?.get("cookie") ?? "";
  if (/(?:^|;\s*)NEXT_LOCALE=en(?:;|$)/.test(cookie)) return "en";
  if (/(?:^|;\s*)NEXT_LOCALE=id(?:;|$)/.test(cookie)) return "id";

  return "id";
}

export function localeFromCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return null;
  if (/(?:^|;\s*)NEXT_LOCALE=en(?:;|$)/.test(cookieHeader)) return "en" as const;
  if (/(?:^|;\s*)NEXT_LOCALE=id(?:;|$)/.test(cookieHeader)) return "id" as const;
  return null;
}
