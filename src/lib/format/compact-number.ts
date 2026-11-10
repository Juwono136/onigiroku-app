/**
 * Compact counts for dense UI (badges, cards).
 * Examples (en): 999 → "999", 1500 → "1.5K", 1200000 → "1.2M"
 */
export function formatCompactCount(value: number, locale = "en"): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const tag = locale.toLowerCase().startsWith("id") ? "id-ID" : "en-US";
  return new Intl.NumberFormat(tag, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: n >= 1_000 ? 1 : 0,
  }).format(n);
}

/** Full grouped number for tooltips / aria (e.g. 1,200,000). */
export function formatFullCount(value: number, locale = "en"): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const tag = locale.toLowerCase().startsWith("id") ? "id-ID" : "en-US";
  return new Intl.NumberFormat(tag).format(n);
}
