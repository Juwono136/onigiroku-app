/**
 * Shared news list query helpers (multi-tag + search + pagination).
 * URL: `/news?q=…&tags=slug-a,slug-b&page=2` (legacy `?tag=` still accepted).
 */

export const NEWS_MAX_TAG_FILTERS = 12;

/** Normalize and dedupe tag slugs for public filters (aligned with Go NormalizeTagSlug ASCII subset). */
export function normalizeNewsTagSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseNewsTagList(
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
    const slug = normalizeNewsTagSlug(part);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= NEWS_MAX_TAG_FILTERS) break;
  }
  return out;
}

export function newsListHref(opts: {
  page?: number;
  tags?: string[];
  search?: string;
}) {
  const params = new URLSearchParams();
  if (opts.search?.trim()) params.set("q", opts.search.trim());
  const tags = parseNewsTagList(opts.tags);
  if (tags.length === 1) params.set("tag", tags[0]!);
  else if (tags.length > 1) params.set("tags", tags.join(","));
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/news?${qs}` : "/news";
}

export function toggleNewsTag(selected: string[], slug: string): string[] {
  const normalized = normalizeNewsTagSlug(slug);
  if (!normalized) return selected;
  if (selected.includes(normalized)) {
    return selected.filter((s) => s !== normalized);
  }
  if (selected.length >= NEWS_MAX_TAG_FILTERS) return selected;
  return [...selected, normalized];
}
