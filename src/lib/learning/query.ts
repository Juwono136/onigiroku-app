/**
 * Student learning-path list query helpers (multi-tag + search + pagination).
 * URL params stay client-side for the dashboard materials grid.
 */

export const LEARNING_MAX_TAG_FILTERS = 12;

/** Normalize tag slugs (aligned with Go NormalizeTagSlug ASCII subset). */
export function normalizeLearningTagSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseLearningTagList(
  input: string | string[] | undefined | null,
): string[] {
  const parts: string[] = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      parts.push(...String(item).split(","));
    }
  } else if (typeof input === "string" && input.trim()) {
    parts.push(...input.split(","));
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const slug = normalizeLearningTagSlug(part);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= LEARNING_MAX_TAG_FILTERS) break;
  }
  return out;
}

export function toggleLearningTag(selected: string[], slug: string): string[] {
  const normalized = normalizeLearningTagSlug(slug);
  if (!normalized) return selected;
  if (selected.includes(normalized)) {
    return selected.filter((s) => s !== normalized);
  }
  if (selected.length >= LEARNING_MAX_TAG_FILTERS) return selected;
  return [...selected, normalized];
}
