"use client";

import { BookOpen, Loader2, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PathCatalogHeader } from "@/components/learning/path-catalog-header";
import { LearningTagFilter } from "@/components/learning/learning-tag-filter";
import { BrandLogo } from "@/components/shared/brand-logo";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { plainExcerpt } from "@/lib/learning/rich-text";
import type {
  CategoryListResult,
  LearningCategoryTag,
} from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function StudentCategoryGrid() {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"position" | "popular" | "name">(
    "position",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const sortDir = sortBy === "popular" ? "desc" : "asc";
  const [data, setData] = useState<CategoryListResult | null>(null);
  const [catalogTags, setCatalogTags] = useState<LearningCategoryTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        setLoading(true);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/learning/categories/tags?limit=80", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json()) as { data?: LearningCategoryTag[] };
        if (res.ok && payload.data) setCatalogTags(payload.data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      sortBy,
      sortDir,
    });
    if (selectedTags.length === 1) params.set("tag", selectedTags[0]!);
    else if (selectedTags.length > 1) params.set("tags", selectedTags.join(","));
    void fetch(`/api/learning/categories?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json()) as { data?: CategoryListResult };
        if (!res.ok || !payload.data) throw new Error("load");
        setData(payload.data);
        setError(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, pageSize, search, selectedTags, sortBy, sortDir]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasFilters = Boolean(search) || selectedTags.length > 0;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  return (
    <div className="relative mx-auto w-full max-w-[96rem] space-y-5 px-3 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-workspace-mesh opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-seigaiha opacity-[0.12]"
        aria-hidden
      />

      <div className="relative">
        <PathCatalogHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          mark="道"
        />

        <div className="path-catalog-toolbar relative mb-5 p-3.5 sm:p-4">
          <div className="relative space-y-3">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
                aria-hidden
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 rounded-xl border-charcoal/15 bg-white/90 pl-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              />
            </div>
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label={t("filters.sort")}
            >
              <p className="mr-1 text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                {t("sort.label")}
              </p>
              {(
                [
                  ["position", t("sort.position")],
                  ["popular", t("sort.popular")],
                  ["name", t("sort.name")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-active={sortBy === key}
                  aria-pressed={sortBy === key}
                  className="path-sort-tab"
                  onClick={() => {
                    if (sortBy === key) return;
                    setSortBy(key);
                    setPage(1);
                    setLoading(true);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <LearningTagFilter
              locale={locale}
              tags={catalogTags}
              selectedTags={selectedTags}
              onChange={(next) => {
                setSelectedTags(next);
                setPage(1);
                setLoading(true);
              }}
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-20" role="status">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : error && items.length === 0 ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center text-sm text-destructive">
            {t("empty.title")}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-[1.15rem] border border-dashed border-charcoal/15 bg-white/60 px-6 py-14 text-center">
            <BookOpen className="mx-auto size-8 text-brand/50" />
            <p className="mt-3 font-semibold text-ink">
              {hasFilters ? t("empty.filtered") : t("empty.title")}
            </p>
            <p className="mt-1 text-sm text-charcoal/60">
              {hasFilters ? t("filters.clear") : t("empty.description")}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-semibold text-ink/80">
                {t("showing", { from, to, total })}
              </p>
            </div>
            <ul
              className={cn(
                "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
                loading && "opacity-60",
              )}
            >
              {items.map((item) => {
                const name =
                  locale === "en" ? item.nameEn || item.nameId : item.nameId;
                const descriptionRaw = plainExcerpt(
                  locale === "en"
                    ? item.descriptionEn || item.descriptionId
                    : item.descriptionId,
                );
                const description =
                  descriptionRaw.length > 110
                    ? `${descriptionRaw.slice(0, 110).replace(/\s+\S*$/, "").trim() || descriptionRaw.slice(0, 110)}…`
                    : descriptionRaw;
                const cover = toBrowserMediaUrl(item.coverUrl);
                const lessonTotal = item.lessonCount;
                const done = item.completedCount ?? 0;
                const pct = lessonTotal
                  ? Math.round((done / lessonTotal) * 100)
                  : 0;
                const tags = item.tags ?? [];
                return (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/materials/categories/${item.slug}`}
                      className="path-card group flex h-full flex-col"
                    >
                      <div className="relative aspect-[16/10] bg-soft">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="size-full object-cover transition duration-700 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[var(--workspace-surface)]">
                            <BrandLogo size={56} alt="" />
                          </div>
                        )}
                        <span className="absolute top-3 left-4 max-w-[46%] truncate rounded-md bg-ink/80 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
                          {t("lessonsCount", { count: lessonTotal })}
                        </span>
                        {lessonTotal > 0 && done >= lessonTotal ? (
                          <span className="absolute top-3 right-3 rounded-md bg-brand px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm">
                            {t("completion.finished")}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4 pl-5">
                        <h2 className="font-jp line-clamp-2 text-base font-bold text-ink group-hover:text-brand">
                          {name}
                        </h2>
                        {description ? (
                          <p className="line-clamp-2 text-[13px] text-charcoal/58">
                            {description}
                          </p>
                        ) : null}
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-md border border-charcoal/10 bg-[var(--workspace-surface)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/55"
                              >
                                {locale === "en"
                                  ? tag.nameEn || tag.nameId
                                  : tag.nameId || tag.nameEn}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-auto space-y-1.5 pt-2">
                          <div className="h-1.5 overflow-hidden rounded-full bg-charcoal/10">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs font-semibold text-charcoal/55">
                            {t("progress", { done, total: lessonTotal })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-5 flex flex-col gap-3 rounded-[1.15rem] border border-charcoal/10 bg-white/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-sm text-charcoal/60">
            {t("showing", { from, to, total })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={String(pageSize)}
              onValueChange={(next) => {
                setPageSize(Number(next));
                setPage(1);
                setLoading(true);
              }}
              options={[12, 24, 48].map((size) => ({
                value: String(size),
                label: t("pageSize", { count: size }),
              }))}
              ariaLabel={t("pageSize", { count: pageSize })}
              triggerClassName="h-10 rounded-xl"
            />
            <button
              type="button"
              className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:opacity-40"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p - 1);
              }}
            >
              {t("prev")}
            </button>
            <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-brand/20 bg-brand/5 px-2.5 py-1.5 text-sm font-bold tabular-nums text-brand">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:opacity-40"
              disabled={!data || page >= data.totalPages || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
            >
              {t("next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
