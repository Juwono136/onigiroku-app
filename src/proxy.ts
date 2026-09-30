import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { resolveRegionLocale } from "@/i18n/region-locale";
import { locales, routing, type Locale } from "@/i18n/routing";

/**
 * Next.js 16 proxy (i18n).
 * First visit: geography ID → Indonesian, any other country → English.
 * User switcher stores NEXT_LOCALE and overrides geo on later visits.
 */
const handleI18n = createMiddleware({
  ...routing,
  // Do not let Accept-Language override region/cookie (product rule).
  localeDetection: false,
});

const LOCALE_COOKIE = "NEXT_LOCALE";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

function readLocaleCookie(request: NextRequest): Locale | null {
  const value = request.cookies.get(LOCALE_COOKIE)?.value;
  if (value && (locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return null;
}

function localeFromPathname(pathname: string): Locale | null {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/id" || pathname.startsWith("/id/")) return "id";
  return null;
}

function withLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, COOKIE_OPTIONS);
  return response;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieLocale = readLocaleCookie(request);
  const pathLocale = localeFromPathname(pathname);

  // Explicit URL locale (e.g. /en/pricing) — honor path and sync cookie.
  if (pathLocale) {
    return withLocaleCookie(handleI18n(request), pathLocale);
  }

  // Saved preference from language switcher.
  if (cookieLocale) {
    if (cookieLocale === "en") {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
      if (url.pathname !== pathname) {
        return withLocaleCookie(NextResponse.redirect(url), "en");
      }
    }
    return withLocaleCookie(handleI18n(request), cookieLocale);
  }

  // First visit: region-based default (ID → id, elsewhere → en).
  const regionLocale = resolveRegionLocale(request);

  if (regionLocale === "en") {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return withLocaleCookie(NextResponse.redirect(url), "en");
  }

  return withLocaleCookie(handleI18n(request), "id");
}

export const config = {
  matcher: ["/", "/(id|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
