import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CoursesFilters } from "@/components/courses/courses-filters";
import { CoursesSearchBar } from "@/components/courses/courses-search-bar";
import { VisitBadge } from "@/components/courses/visit-badge";
import { PathCatalogHeader } from "@/components/learning/path-catalog-header";
import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import {
  goPublicListCourseTags,
  goPublicListCourses,
} from "@/lib/api/go-learning";
import { coursesListHref } from "@/lib/courses/query";
import { plainExcerpt } from "@/lib/learning/rich-text";
import type { LearningCategory } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  tags?: string[];
  page?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
};

function cardExcerpt(raw: string, max = 110) {
  const text = plainExcerpt(raw);
  if (text.length <= max) return text;
  const slice = text.slice(0, max).replace(/\s+\S*$/, "").trim();
  return `${slice || text.slice(0, max)}…`;
}

export async function CoursesList({
  locale,
  tags = [],
  page = 1,
  search = "",
  sortBy = "position",
  sortDir = "asc",
}: Props) {
  const t = await getTranslations("courses");
  const pageSize = 9;
  const resolvedSort =
    sortBy === "popular" || sortBy === "name" ? sortBy : "position";
  const resolvedDir =
    resolvedSort === "popular" ? "desc" : sortDir === "desc" ? "desc" : "asc";

  let items: LearningCategory[] = [];
  let totalPages = 1;
  let total = 0;
  let error: string | null = null;
  let filterTags: Awaited<ReturnType<typeof goPublicListCourseTags>> = [];

  try {
    const [data, catalog] = await Promise.all([
      goPublicListCourses({
        page,
        pageSize,
        tags,
        search,
        sortBy: resolvedSort,
        sortDir: resolvedDir,
      }),
      goPublicListCourseTags(80),
    ]);
    items = data.items as LearningCategory[];
    totalPages = Math.max(1, data.totalPages);
    total = data.total;
    filterTags = catalog;
  } catch {
    error = t("errors.loadFailed");
  }

  return (
    <div className="relative flex flex-1 flex-col bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-hero-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-seigaiha opacity-[0.16]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PathCatalogHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          mark="学"
        />

        <div className="path-catalog-toolbar relative mb-6 p-3.5 sm:p-4">
          <div className="relative space-y-3.5">
            <CoursesSearchBar
              initialSearch={search}
              tags={tags}
              sortBy={resolvedSort}
              sortDir={resolvedDir}
            />
            <CoursesFilters
              locale={locale}
              catalog={filterTags}
              selectedTags={tags}
              search={search}
              sortBy={resolvedSort}
              sortDir={resolvedDir}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-[1.15rem] border border-dashed border-charcoal/15 bg-white/70 px-6 py-14 text-center">
            <BookOpen className="mx-auto size-9 text-charcoal/30" aria-hidden />
            <p className="mt-3 text-base font-semibold text-ink">
              {t("empty.title")}
            </p>
            <p className="mt-1 text-sm text-charcoal/60">
              {t("empty.description")}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-semibold text-ink/80">
                {t("resultCount", { count: total })}
              </p>
              {total > 0 ? (
                <p className="text-xs font-medium text-charcoal/45">
                  {t("pagination.showing", {
                    from: (page - 1) * pageSize + 1,
                    to: Math.min(page * pageSize, total),
                    total,
                  })}
                </p>
              ) : null}
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => {
                const name =
                  locale === "en" ? item.nameEn || item.nameId : item.nameId;
                const description = cardExcerpt(
                  locale === "en"
                    ? item.descriptionEn || item.descriptionId
                    : item.descriptionId,
                );
                const cover = toBrowserMediaUrl(item.coverUrl);
                const views = item.studentViewCount ?? 0;
                return (
                  <li
                    key={item.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <Link
                      href={`/learning-path/${item.slug}`}
                      className="path-card group flex h-full flex-col"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[var(--workspace-surface)]">
                            <BrandLogo size={64} alt="" />
                          </div>
                        )}
                        <span className="absolute top-3 left-4 max-w-[46%] truncate rounded-md bg-ink/80 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
                          {t("lessonsCount", { count: item.lessonCount })}
                        </span>
                        <VisitBadge
                          count={views}
                          locale={locale}
                          tone="overlay"
                          className="absolute top-3 right-3 z-[1] max-w-[46%]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4 pl-5">
                        <h2 className="font-jp line-clamp-2 text-base font-bold tracking-tight text-ink group-hover:text-brand sm:text-[1.05rem]">
                          {name}
                        </h2>
                        {description ? (
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-charcoal/58">
                            {description}
                          </p>
                        ) : null}
                        {(item.tags?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {item.tags!.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-md border border-charcoal/10 bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/55"
                              >
                                {locale === "en"
                                  ? tag.nameEn || tag.nameId
                                  : tag.nameId || tag.nameEn}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand">
                          {t("actions.viewCourse")}
                          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label={t("pagination.label")}
            >
              {page > 1 ? (
                <Link
                  href={coursesListHref({
                    search,
                    tags,
                    sortBy: resolvedSort,
                    sortDir: resolvedDir,
                    page: page - 1,
                  })}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 cursor-pointer gap-1.5 rounded-xl px-3.5 text-sm font-semibold",
                  )}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">
                    {t("pagination.prev")}
                  </span>
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 pointer-events-none gap-1.5 rounded-xl px-3.5 text-sm font-semibold opacity-40",
                  )}
                  aria-disabled
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">
                    {t("pagination.prev")}
                  </span>
                </span>
              )}
              <span className="inline-flex min-w-[4.75rem] items-center justify-center rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-sm font-bold tabular-nums text-brand">
                {t("pagination.page", { page, total: totalPages })}
              </span>
              {page < totalPages ? (
                <Link
                  href={coursesListHref({
                    search,
                    tags,
                    sortBy: resolvedSort,
                    sortDir: resolvedDir,
                    page: page + 1,
                  })}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 cursor-pointer gap-1.5 rounded-xl px-3.5 text-sm font-semibold",
                  )}
                >
                  <span className="hidden sm:inline">
                    {t("pagination.next")}
                  </span>
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 pointer-events-none gap-1.5 rounded-xl px-3.5 text-sm font-semibold opacity-40",
                  )}
                  aria-disabled
                >
                  <span className="hidden sm:inline">
                    {t("pagination.next")}
                  </span>
                  <ChevronRight className="size-4" />
                </span>
              )}
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
