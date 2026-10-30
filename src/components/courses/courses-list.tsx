import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CoursesFilters } from "@/components/courses/courses-filters";
import { CoursesSearchBar } from "@/components/courses/courses-search-bar";
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

function cardExcerpt(raw: string, max = 140) {
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
  const resolvedSort = sortBy === "popular" || sortBy === "name" ? sortBy : "position";
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
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-hero-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-seigaiha opacity-[0.14]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="mb-8 max-w-2xl space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-base text-charcoal/70">{t("subtitle")}</p>
        </header>

        <div className="mb-8 space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] backdrop-blur sm:p-5">
          <CoursesSearchBar
            key={`${search}::${tags.join(",")}::${resolvedSort}`}
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

        {error ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-charcoal/15 bg-white/70 px-6 py-16 text-center">
            <BookOpen className="mx-auto size-10 text-charcoal/30" aria-hidden />
            <p className="mt-4 text-base font-semibold text-ink">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-charcoal/60">{t("empty.description")}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-charcoal/55">
                {t("resultCount", { count: total })}
              </p>
              {total > 0 ? (
                <p className="text-xs font-semibold text-charcoal/45">
                  {t("pagination.showing", {
                    from: (page - 1) * pageSize + 1,
                    to: Math.min(page * pageSize, total),
                    total,
                  })}
                </p>
              ) : null}
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                      className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_16px_36px_-30px_rgba(15,23,42,0.4)] transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_22px_48px_-28px_rgba(185,28,28,0.28)]"
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
                            <BrandLogo size={72} alt="" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand uppercase shadow-sm backdrop-blur">
                          {t("lessonsCount", { count: item.lessonCount })}
                        </span>
                        {views > 0 ? (
                          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                            <Flame className="size-3 text-brand" aria-hidden />
                            {t("views", { count: views })}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-2.5 p-5">
                        <h2 className="font-jp text-lg font-bold tracking-tight text-ink group-hover:text-brand">
                          {name}
                        </h2>
                        {description ? (
                          <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/65">
                            {description}
                          </p>
                        ) : null}
                        {(item.tags?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.tags!.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full border border-charcoal/10 bg-[var(--workspace-surface)] px-2 py-0.5 text-[10px] font-semibold text-charcoal/60"
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
              className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
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
                    "h-11 cursor-pointer gap-2 rounded-xl px-4 font-semibold",
                  )}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">{t("pagination.prev")}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 pointer-events-none gap-2 rounded-xl px-4 font-semibold opacity-40",
                  )}
                  aria-disabled
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">{t("pagination.prev")}</span>
                </span>
              )}
              <span className="min-w-[5.5rem] text-center text-sm font-semibold text-charcoal/60 tabular-nums">
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
                    "h-11 cursor-pointer gap-2 rounded-xl px-4 font-semibold",
                  )}
                >
                  <span className="hidden sm:inline">{t("pagination.next")}</span>
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 pointer-events-none gap-2 rounded-xl px-4 font-semibold opacity-40",
                  )}
                  aria-disabled
                >
                  <span className="hidden sm:inline">{t("pagination.next")}</span>
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
