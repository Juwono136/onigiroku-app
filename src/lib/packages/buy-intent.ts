/**
 * Buy-intent helpers: carry "I want to buy this class" across register/login.
 *
 * Preferred flow (direct): /classes → Buy now → /register|/login?callbackUrl=/classes/{slug}/checkout
 *                         → checkout (auth required).
 * Legacy: /dashboard?buy={slug} still opens PurchaseIntentModal for older links/cookies.
 */

export const BUY_INTENT_COOKIE = "buy_intent";
export const BUY_INTENT_MAX_AGE_SECONDS = 15 * 60;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/i;

/** Returns a normalized slug or null when unsafe/invalid. */
export function parseBuySlug(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return SLUG_RE.test(slug) ? slug : null;
}

/** App-relative path (no locale prefix) users land on after auth. */
export function buyIntentCallbackPath(slug: string): string {
  return checkoutPath(slug);
}

export function checkoutPath(slug: string): string {
  return `/classes/${encodeURIComponent(slug)}/checkout`;
}

export function registerWithBuyHref(slug: string): string {
  return `/register?callbackUrl=${encodeURIComponent(checkoutPath(slug))}`;
}

export function loginWithBuyHref(slug: string): string {
  return `/login?callbackUrl=${encodeURIComponent(checkoutPath(slug))}`;
}

/** Only allow same-origin, app-relative callbacks (blocks `//host` and `/\\host`). */
export function safeCallbackPath(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return undefined;
  }
  return raw;
}

/** Extract the buy slug from a callback path such as `/dashboard?buy=slug`. */
export function buySlugFromCallback(callback: string | undefined | null): string | null {
  const path = safeCallbackPath(callback);
  if (!path) return null;
  const qIndex = path.indexOf("?");
  if (qIndex < 0) return null;
  return parseBuySlug(new URLSearchParams(path.slice(qIndex + 1)).get("buy"));
}

export function writeBuyIntentCookie(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${BUY_INTENT_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=${BUY_INTENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function readBuyIntentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${BUY_INTENT_COOKIE}=`));
  if (!match) return null;
  try {
    return parseBuySlug(decodeURIComponent(match.slice(BUY_INTENT_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

export function clearBuyIntentCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${BUY_INTENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
