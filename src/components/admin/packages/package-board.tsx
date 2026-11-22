"use client";

import { Package, Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminCategoryBoardSkeleton } from "@/components/admin/admin-loading";
import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { plainExcerpt } from "@/lib/learning/rich-text";
import { formatDiscountPercent, formatIdr } from "@/lib/packages/format";
import type { PackageListResult, PackageStatus } from "@/lib/packages/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const PAGE_SIZES = ["12", "24", "48"] as const;

type SortKey = "position" | "updatedAt" | "name";

function statusTone(status: PackageStatus) {
  switch (status) {
    case "PUBLISHED":
      return "bg-brand text-white";
    case "ARCHIVED":
      return "bg-charcoal/80 text-white";
    default:
      return "bg-ink/80 text-white";
  }
}

export function PackageBoard() {
  const t = useTranslations("packagesAdmin");
  const locale = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("position");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [data, setData] = useState<PackageListResult | null>(null);
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
    });
    void fetch(`/api/admin/packages?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json()) as {
          success?: boolean;
          data?: PackageListResult;
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
  }, [page, pageSize, search, status, sortBy]);

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
    <div className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-seigaiha opacity-[0.18]"
        aria-hidden
      />

      <div className="relative">
        <header className="mb-5 space-y-3 sm:mb-7">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-charcoal/10 bg-white/85 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur">
                <Package className="size-3.5 text-brand" aria-hidden />
                {t("totalLabel", { count: total })}
              </div>
              <Link
                href="/admin/packages/new"
                className={cn(
                  buttonVariants(),
                  "h-11 cursor-pointer gap-2 rounded-2xl px-4 font-semibold shadow-sm",
                )}
              >
                <Plus className="size-4" aria-hidden />
                {t("actions.new")}
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-5 overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-elevated)] p-3.5 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.4)] sm:p-4">
          <div className="space-y-3.5">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
                aria-hidden
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 rounded-xl border-charcoal/15 bg-white/90 pl-10 shadow-sm"
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
                  ["position", t("sort.position")],
                  ["updatedAt", t("sort.updated")],
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
              label={t("loadingPackages")}
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
                aria-label={t("loadingPackages")}
              >
                <span className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal/70 shadow-sm">
                  {t("loadingPackages")}
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
                  locale === "en" ? item.nameEn || item.nameId : item.nameId || item.nameEn;
                const descriptionRaw = plainExcerpt(
                  locale === "en"
                    ? item.descriptionEn || item.descriptionId
                    : item.descriptionId || item.descriptionEn,
                );
                const description =
                  descriptionRaw.length > 110
                    ? `${descriptionRaw.slice(0, 110).replace(/\s+\S*$/, "").trim() || descriptionRaw.slice(0, 110)}…`
                    : descriptionRaw;
                const cover = toBrowserMediaUrl(item.coverUrl);
                const entitlementCount = item.entitlements?.length ?? 0;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/admin/packages/${item.id}`}
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
                            statusTone(item.status),
                          )}
                        >
                          {t(`status.${item.status}`)}
                        </span>
                        {item.discountActive && item.discountPercent > 0 ? (
                          <span className="absolute top-3 right-3 rounded-md bg-brand px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm">
                            {t("discountBadge", {
                              percent: formatDiscountPercent(
                                item.discountPercent,
                                locale,
                              ),
                            })}
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
                        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
                          <div className="min-w-0">
                            <p className="text-lg font-bold tabular-nums text-ink">
                              {formatIdr(item.effectivePriceIdr, locale)}
                            </p>
                            {item.discountActive && item.priceIdr > item.effectivePriceIdr ? (
                              <p className="text-xs tabular-nums text-charcoal/50 line-through">
                                {formatIdr(item.priceIdr, locale)}
                              </p>
                            ) : null}
                          </div>
                          <span className="rounded-md border border-charcoal/10 bg-[var(--workspace-surface)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/55">
                            {t("entitlementCount", { count: entitlementCount })}
                          </span>
                        </div>
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
