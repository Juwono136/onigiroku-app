export type ClassListQuery = {
  search?: string;
  page?: number;
};

/** Locale-agnostic catalog href (use with the i18n `Link` / `router`). */
export function classesListHref(query: ClassListQuery): string {
  const params = new URLSearchParams();
  const search = (query.search ?? "").trim();
  if (search) params.set("q", search);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `/classes?${qs}` : "/classes";
}
