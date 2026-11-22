export function formatIdr(amount: number, locale = "id-ID"): string {
  const value = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return new Intl.NumberFormat(locale === "en" ? "en-ID" : "id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseIdrInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Parse discount input accepting "0,5" / "0.5" / "12". Rounds to 2 dp, clamps 0–100. */
export function parseDiscountPercent(raw: string | number): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return 0;
    return Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
  }
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

/** Display helper for badges: trims trailing zeros (0.50 → 0.5, 10.00 → 10). */
export function formatDiscountPercent(value: number, locale = "id"): string {
  const pct = parseDiscountPercent(value);
  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return formatter.format(pct);
}
