"use client";

import { BookOpen, Loader2, Search } from "lucide-react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { plainExcerpt } from "@/lib/learning/rich-text";
import type { CategoryListResult } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function StudentCategoryGrid() {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
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
      sortBy: "position",
      sortDir: "asc",
    });
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
  }, [page, pageSize, search]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">{t("subtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_22px_48px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-2.5 border-b border-charcoal/10 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40" aria-hidden />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("searchPlaceholder")} className="h-12 rounded-2xl border-charcoal/20 bg-[var(--workspace-card)] pl-10 shadow-[0_10px_28px_-14px_rgba(24,24,27,0.55)]" />
          </div>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-20" role="status">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : error && items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-destructive">{t("empty.title")}</p>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <BookOpen className="mx-auto size-8 text-brand/50" />
            <p className="mt-3 font-semibold text-ink">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-charcoal/60">{t("empty.description")}</p>
          </div>
        ) : (
          <ul className={cn("grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3", loading && "opacity-60")}>
            {items.map((item) => {
              const name = locale === "en" ? item.nameEn || item.nameId : item.nameId;
              const description = plainExcerpt(locale === "en" ? item.descriptionEn || item.descriptionId : item.descriptionId);
              const cover = toBrowserMediaUrl(item.coverUrl);
              const lessonTotal = item.lessonCount;
              const done = item.completedCount ?? 0;
              const pct = lessonTotal ? Math.round((done / lessonTotal) * 100) : 0;
              return (
                <li key={item.id}>
                  <Link href={`/dashboard/materials/categories/${item.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md">
                    <div className="relative aspect-[16/10] bg-soft">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="size-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-[var(--workspace-surface)]"><BrandLogo size={64} alt="" /></div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h2 className="font-jp text-lg font-bold text-ink group-hover:text-brand">{name}</h2>
                      {description ? <p className="line-clamp-2 text-sm text-charcoal/65">{description}</p> : null}
                      <div className="mt-auto space-y-1.5 pt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-charcoal/10">
                          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs font-semibold text-charcoal/55">{t("progress", { done, total: lessonTotal })}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-3 border-t border-charcoal/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-charcoal/60">{t("showing", { from, to, total })}</p>
          <div className="flex items-center gap-2">
            <FilterSelect
              value={String(pageSize)}
              onValueChange={(next) => {
                setPageSize(Number(next));
                setPage(1);
                setLoading(true);
              }}
              options={[10, 20, 50].map((size) => ({ value: String(size), label: t("pageSize", { count: size }) }))}
              ariaLabel={t("pageSize", { count: pageSize })}
              triggerClassName="h-10 rounded-xl"
            />
            <button type="button" className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>{t("prev")}</button>
            <span className="min-w-12 text-center text-sm font-semibold">{page}/{Math.max(data?.totalPages ?? 1, 1)}</span>
            <button type="button" className="h-10 cursor-pointer rounded-xl border border-charcoal/15 px-3 text-sm font-semibold disabled:opacity-40" disabled={!data || page >= data.totalPages || loading} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>{t("next")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
