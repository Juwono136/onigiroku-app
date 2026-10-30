import { parseNewsTagList } from "@/lib/news/query";

export type CourseListQuery = {
  search?: string;
  tags?: string[];
  page?: number;
  sortBy?: string;
  sortDir?: string;
};

export function coursesListHref(query: CourseListQuery): string {
  const params = new URLSearchParams();
  const search = (query.search ?? "").trim();
  if (search) params.set("q", search);
  const tags = parseNewsTagList(query.tags ?? []);
  if (tags.length === 1) params.set("tag", tags[0]!);
  else if (tags.length > 1) params.set("tags", tags.join(","));
  const page = query.page && query.page > 1 ? query.page : undefined;
  if (page) params.set("page", String(page));
  const sortBy = (query.sortBy ?? "").trim();
  if (sortBy && sortBy !== "position") params.set("sortBy", sortBy);
  const sortDir = (query.sortDir ?? "").trim().toLowerCase();
  if (sortDir === "desc") params.set("sortDir", "desc");
  const qs = params.toString();
  return qs ? `/learning-path?${qs}` : "/learning-path";
}
