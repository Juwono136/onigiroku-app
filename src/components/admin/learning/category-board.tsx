"use client";

import { Plus, Search } from "lucide-react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminCategoryBoardSkeleton } from "@/components/admin/admin-loading";
import { buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { plainExcerpt } from "@/lib/learning/rich-text";
import type { CategoryListResult, LearningStatus } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const PAGE_SIZES = ["10", "20", "50"] as const;

export function CategoryBoard() {
  const t = useTranslations("learningAdmin");
  const locale = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<CategoryListResult | null>(null);
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
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      status,
      sortBy,
      sortDir: sortBy === "name" ? "asc" : "asc",
    });
    if (sortBy === "updatedAt") params.set("sortDir", "desc");
    void fetch(`/api/admin/learning/categories?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json()) as { success?: boolean; data?: CategoryListResult };
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
  }, [page, pageSize, search, status, sortBy]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="relative mx-auto w-full max-w-[96rem] space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">{t("eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">{t("subtitle")}</p>
        </div>
        <Link href="/admin/learning/new" className={cn(buttonVariants(), "h-11 cursor-pointer gap-2 rounded-2xl px-4 font-semibold")}>
          <Plus className="size-4" aria-hidden />
          {t("actions.new")}
        </Link>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_22px_48px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-2.5 border-b border-charcoal/10 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40" aria-hidden />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-12 rounded-2xl border-charcoal/20 bg-[var(--workspace-card)] pl-10 shadow-[0_10px_28px_-14px_rgba(24,24,27,0.55)]"
            />
          </div>
          <FilterSelect
            value={status}
            onValueChange={(next) => {
              setStatus(next);
              setPage(1);
              setLoading(true);
            }}
            options={[
              { value: "ALL", label: t("filters.all") },
              { value: "DRAFT", label: t("status.DRAFT") },
              { value: "PUBLISHED", label: t("status.PUBLISHED") },
              { value: "ARCHIVED", label: t("status.ARCHIVED") },
            ]}
            ariaLabel={t("fields.status")}
            triggerClassName="h-12 min-w-40 rounded-2xl"
          />
          <FilterSelect
            value={sortBy}
            onValueChange={(next) => {
              setSortBy(next);
              setPage(1);
              setLoading(true);
            }}
            options={[
              { value: "updatedAt", label: t("sort.updated") },
              { value: "name", label: t("sort.name") },
            ]}
            ariaLabel={t("sort.updated")}
            triggerClassName="h-12 min-w-44 rounded-2xl"
          />
        </div>

        {loading && !data ? (
          <div className="p-4 sm:p-5">
            <AdminCategoryBoardSkeleton
              cards={Math.min(pageSize, 6)}
              label={t("loadingCategories")}
            />
          </div>
        ) : error && !data ? (
          <p className="px-6 py-16 text-center text-sm text-destructive">{t("errors.load")}</p>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-ink">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-charcoal/60">{t("empty.description")}</p>
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
            <ul
              className={cn(
                "grid gap-4 p-4 transition-opacity duration-200 sm:grid-cols-2 sm:p-5 xl:grid-cols-3",
                loading && "pointer-events-none opacity-50",
              )}
            >
              {items.map((item) => {
                const name = locale === "en" ? item.nameEn || item.nameId : item.nameId;
                const description = plainExcerpt(locale === "en" ? item.descriptionEn || item.descriptionId : item.descriptionId);
                const cover = toBrowserMediaUrl(item.coverUrl);
                return (
                  <li key={item.id}>
                    <Link
                      href={`/admin/learning/${item.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/9] bg-soft">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="size-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[var(--workspace-surface)]">
                            <BrandLogo size={64} alt="" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wide text-ink uppercase shadow-sm">
                          {t(`status.${item.status as LearningStatus}`)}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <h2 className="font-jp text-lg font-bold text-ink group-hover:text-brand">{name}</h2>
                        {description ? <p className="line-clamp-2 text-sm text-charcoal/60">{description}</p> : null}
                        <p className="mt-auto pt-2">
                          <span className="inline-flex rounded-full bg-[var(--workspace-surface)] px-2.5 py-1 text-xs font-semibold text-charcoal/70">
                            {t("lessonCount", { count: item.lessonCount })}
                          </span>
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-charcoal/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-charcoal/60">{t("showing", { from, to, total })}</p>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={String(pageSize)}
              onValueChange={(next) => {
                setPageSize(Number(next));
                setPage(1);
                setLoading(true);
              }}
              options={PAGE_SIZES.map((size) => ({ value: size, label: t("pageSize", { count: Number(size) }) }))}
              ariaLabel={t("pageSize", { count: pageSize })}
              triggerClassName="h-10 rounded-xl"
            />
            <button type="button" className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>
              {t("prev")}
            </button>
            <span className="min-w-12 text-center text-sm font-semibold text-ink">{page}/{Math.max(data?.totalPages ?? 1, 1)}</span>
            <button type="button" className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={!data || page >= data.totalPages || loading} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>
              {t("next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
