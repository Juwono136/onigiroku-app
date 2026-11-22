"use client";

import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminCategoryBoardSkeleton } from "@/components/admin/admin-loading";
import { PathCatalogHeader } from "@/components/learning/path-catalog-header";
import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { plainExcerpt } from "@/lib/learning/rich-text";
import type { CategoryListResult, LearningStatus } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const PAGE_SIZES = ["10", "20", "50"] as const;

type SortKey = "position" | "updatedAt" | "popular" | "name";

function statusTone(status: LearningStatus) {
  switch (status) {
    case "PUBLISHED":
      return "bg-brand text-white";
    case "ARCHIVED":
      return "bg-charcoal/80 text-white";
    default:
      return "bg-ink/80 text-white";
  }
}

export function CategoryBoard() {
  const t = useTranslations("learningAdmin");
  const locale = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("updatedAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<CategoryListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sortDir =
    sortBy === "popular" || sortBy === "updatedAt" ? "desc" : "asc";

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
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      status,
      sortBy,
      sortDir,
    });
    void fetch(`/api/admin/learning/categories?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json()) as {
          success?: boolean;
          data?: CategoryListResult;
        };
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
  }, [page, pageSize, search, status, sortBy, sortDir]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  const emptyCopy =
    status === "DRAFT"
      ? { title: t("empty.draftTitle"), description: t("empty.draftDescription") }
      : status === "ARCHIVED"
        ? {
            title: t("empty.archivedTitle"),
            description: t("empty.archivedDescription"),
          }
        : status === "PUBLISHED"
          ? {
              title: t("empty.publishedTitle"),
              description: t("empty.publishedDescription"),
            }
          : { title: t("empty.title"), description: t("empty.description") };

  return (
    <div className="relative mx-auto w-full max-w-[96rem] space-y-5 px-3 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-workspace-mesh opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-asanoha opacity-[0.18]"
        aria-hidden
      />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <PathCatalogHeader
            eyebrow={t("eyebrow")}
            title={t("title")}
            subtitle={t("subtitle")}
            mark="管"
            className="mb-0"
          />
          <Link
            href="/admin/learning/new"
            className={cn(
              buttonVariants(),
              "h-11 w-full shrink-0 cursor-pointer gap-2 rounded-xl px-4 font-semibold sm:mt-1 sm:w-auto",
            )}
          >
            <Plus className="size-4" aria-hidden />
            {t("actions.new")}
          </Link>
        </div>

        <div className="path-catalog-toolbar relative mb-5 p-3.5 sm:p-4">
          <div className="relative space-y-3.5">
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
              aria-label={t("fields.status")}
            >
              <p className="mr-1 text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                {t("fields.status")}
              </p>
              {(
                [
                  ["ALL", t("filters.all")],
                  ["DRAFT", t("status.DRAFT")],
                  ["PUBLISHED", t("status.PUBLISHED")],
                  ["ARCHIVED", t("status.ARCHIVED")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-active={status === key}
                  aria-pressed={status === key}
                  className="path-tag-chip"
                  onClick={() => {
                    if (status === key) return;
                    setStatus(key);
                    setPage(1);
                    setLoading(true);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-charcoal/60">
              {status === "DRAFT"
                ? t("filters.draftHint")
                : status === "ARCHIVED"
                  ? t("filters.archivedHint")
                  : status === "PUBLISHED"
                    ? t("filters.publishedHint")
                    : t("filters.allHint")}
            </p>

            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label={t("sort.label")}
            >
              <p className="mr-1 text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                {t("sort.label")}
              </p>
              {(
                [
                  ["updatedAt", t("sort.updated")],
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
          </div>
        </div>

        {loading && !data ? (
          <div className="rounded-[1.15rem] border border-charcoal/10 bg-white/70 p-4 sm:p-5">
            <AdminCategoryBoardSkeleton
              cards={Math.min(pageSize, 6)}
              label={t("loadingCategories")}
            />
          </div>
        ) : error && !data ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center text-sm text-destructive">
            {t("errors.load")}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-[1.15rem] border border-dashed border-charcoal/15 bg-white/60 px-6 py-14 text-center">
            <p className="font-semibold text-ink">{emptyCopy.title}</p>
            <p className="mt-1 text-sm text-charcoal/60">{emptyCopy.description}</p>
          </div>
        ) : (
          <div className="relative">
            {loading ? (
              <div
                className="absolute inset-0 z-10 flex items-start justify-center bg-[color-mix(in_oklab,var(--workspace-card)_72%,transparent)] pt-16 backdrop-blur-[1px]"
                role="status"
                aria-live="polite"
                aria-label={t("loadingCategories")}
              >
                <span className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal/70 shadow-sm">
                  {t("loadingCategories")}
                </span>
              </div>
            ) : null}
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-semibold text-ink/80">
                {t("showing", { from, to, total })}
              </p>
            </div>
            <ul
              className={cn(
                "grid gap-4 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
                loading && "pointer-events-none opacity-50",
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
                return (
                  <li key={item.id}>
                    <Link
                      href={`/admin/learning/${item.id}`}
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
                        <span
                          className={cn(
                            "absolute top-3 left-4 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm",
                            statusTone(item.status as LearningStatus),
                          )}
                        >
                          {t(`status.${item.status as LearningStatus}`)}
                        </span>
                        <span className="absolute top-3 right-3 max-w-[46%] truncate rounded-md bg-white/92 px-2 py-1 text-[10px] font-bold tracking-wide text-ink uppercase shadow-sm backdrop-blur-sm">
                          {t("lessonCount", { count: item.lessonCount })}
                        </span>
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
                        {(item.tags?.length ?? 0) > 0 ? (
                          <div className="mt-auto flex flex-wrap gap-1 pt-1">
                            {item.tags!.slice(0, 3).map((tag) => (
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
                        ) : (
                          <div className="mt-auto" />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
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
              options={PAGE_SIZES.map((size) => ({
                value: size,
                label: t("pageSize", { count: Number(size) }),
              }))}
              ariaLabel={t("pageSize", { count: pageSize })}
              triggerClassName="h-10 rounded-xl"
            />
            <button
              type="button"
              className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
              className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
