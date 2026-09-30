/**
 * Resolve the first-visit UI locale from request geography.
 * Indonesia → `id`, any other known country → `en`.
 * When geo is unavailable (local/dev), fall back to Accept-Language, then `id`.
 * Production: Vercel/Cloudflare/CloudFront geo headers are checked first.
 */
import type { NextRequest } from "next/server";

import type { Locale } from "@/i18n/routing";

const GEO_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-appengine-country",
] as const;

export function getRequestCountryCode(request: NextRequest): string | null {
  for (const header of GEO_HEADERS) {
    const raw = request.headers.get(header)?.trim().toUpperCase();
    if (raw && raw.length === 2 && raw !== "XX" && raw !== "T1") {
      return raw;
    }
  }
  return null;
}

export function resolveRegionLocale(request: NextRequest): Locale {
  const override = process.env.LOCALE_REGION_OVERRIDE?.trim().toLowerCase();
  if (override === "id" || override === "en") {
    return override;
  }

  const country = getRequestCountryCode(request);
  if (country === "ID") return "id";
  if (country) return "en";

  const accept = request.headers.get("accept-language")?.toLowerCase() ?? "";
  const primary = accept.split(",")[0]?.trim() ?? "";
  if (primary.startsWith("id")) return "id";
  if (primary.startsWith("en")) return "en";

  return "id";
}
