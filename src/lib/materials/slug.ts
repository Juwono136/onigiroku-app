/**
 * Client-side slug helpers aligned with Go `NormalizeTagSlug` / `slugifyTitle`
 * so the admin editor can preview the URL before save.
 */

export function normalizeMaterialSlug(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) return "";

  // NFKD + strip combining marks (approx. Go unicode.Mn)
  const normalized = lower.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  let out = "";
  for (const ch of normalized) {
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) {
      out += ch;
    } else {
      out += "-";
    }
  }
  return out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Preview of material URL slug from a title (matches Go slugifyTitle). */
export function previewMaterialSlug(title: string): string {
  let s = normalizeMaterialSlug(title);
  if (!s || s.length < 2) return "material";
  if (s.length > 80) {
    s = s.slice(0, 80).replace(/-+$/g, "");
  }
  return s || "material";
}
