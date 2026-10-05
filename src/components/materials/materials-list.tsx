"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import type { MaterialListItem, MaterialListResult, MaterialTag } from "@/lib/materials/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  initialTag?: string;
};

function formatDate(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function tagLabel(tag: MaterialTag, locale: string) {
  return locale === "en" ? tag.nameEn || tag.nameId : tag.nameId || tag.nameEn;
}

export function MaterialsList({ initialTag = "" }: Props) {
  const t = useTranslations("studentMaterials");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState(initialTag);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [data, setData] = useState<MaterialListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 320);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          locale: locale === "en" ? "en" : "id",
          sortBy: "publishedAt",
          sortDir: "desc",
        });
        if (search) params.set("search", search);
        if (tag) params.set("tag", tag);

        const res = await fetch(`/api/materials?${params.toString()}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: MaterialListResult;
          error?: { message?: string; code?: string };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? t("errors.loadFailed"));
        }
        setData(json.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : t("errors.loadFailed"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [locale, page, pageSize, search, t, tag]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const tagChips = useMemo(() => {
    const map = new Map<string, MaterialTag>();
    for (const item of items) {
      for (const itemTag of item.tags ?? []) {
        map.set(itemTag.slug, itemTag);
      }
    }
    return Array.from(map.values()).slice(0, 16);
  }, [items]);

  function applyTag(next: string) {
    setTag(next);
    setPage(1);
    const params = new URLSearchParams();
    if (next) params.set("tag", next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-seigaiha opacity-[0.18]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
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
            <div className="inline-flex items-center gap-2 rounded-2xl border border-charcoal/10 bg-white/85 px-3.5 py-2 text-sm font-semibold text-ink shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur">
              <span className="flex size-7 items-center justify-center rounded-xl bg-ink/5 text-ink">
                <BookOpen className="size-3.5" aria-hidden />
              </span>
              {t("totalLabel", { count: total })}
            </div>
          </div>
        </header>

        <div className="mb-5 flex flex-col gap-3">
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
              aria-hidden
            />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 rounded-2xl border-charcoal/12 bg-white/90 pl-10 pr-10 text-sm shadow-sm"
              aria-label={t("searchPlaceholder")}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-charcoal/45 transition-colors hover:bg-soft hover:text-ink"
                aria-label={t("actions.clearSearch")}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          {(tagChips.length > 0 || tag) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-charcoal/55 uppercase">
                {t("filters.tags")}
              </span>
              {tag ? (
                <button
                  type="button"
                  onClick={() => applyTag("")}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
                >
                  {tag}
                  <X className="size-3" aria-hidden />
                </button>
              ) : null}
              {tagChips
                .filter((chip) => chip.slug !== tag)
                .map((chip) => (
                  <Link
                    key={chip.id}
                    href={`/dashboard/materials?tag=${encodeURIComponent(chip.slug)}`}
                    className="inline-flex h-8 cursor-pointer items-center rounded-full border border-charcoal/12 bg-white/80 px-3 text-xs font-semibold text-charcoal/80 transition-colors hover:border-brand/30 hover:text-brand"
                    onClick={() => {
                      setTag(chip.slug);
                      setPage(1);
                    }}
                  >
                    {tagLabel(chip, locale)}
                  </Link>
                ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-charcoal/10 bg-white/60"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal/15 bg-white/70 px-6 py-16 text-center">
            <BookOpen className="mx-auto size-8 text-charcoal/35" aria-hidden />
            <p className="mt-3 text-base font-semibold text-ink">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-charcoal/65">{t("empty.description")}</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <MaterialCard key={item.id} item={item} locale={locale} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 pt-4">
            <p className="text-sm text-charcoal/65">
              {t("pagination.showing", {
                from: total === 0 ? 0 : (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 cursor-pointer rounded-xl"
                disabled={page <= 1 || loading || pending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t("pagination.prev")}
              >
                <ChevronLeft className="size-4" aria-hidden />
                {t("pagination.prev")}
              </Button>
              <span className="min-w-16 text-center text-sm font-semibold text-ink">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-9 cursor-pointer rounded-xl"
                disabled={page >= totalPages || loading || pending}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t("pagination.next")}
              >
                {t("pagination.next")}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MaterialCard({
  item,
  locale,
}: {
  item: MaterialListItem;
  locale: string;
}) {
  const t = useTranslations("studentMaterials");
  const cover = toBrowserMediaUrl(item.coverUrl);
  const published = formatDate(item.publishedAt, locale);

  return (
    <li>
      <Link
        href={`/dashboard/materials/${item.slug}`}
        className={cn(
          "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] shadow-[0_10px_28px_-26px_rgba(67,64,64,0.55)] transition-all",
          "hover:border-brand/25 hover:shadow-[0_18px_36px_-24px_rgba(67,64,64,0.55)]",
        )}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-soft">
          <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-30" aria-hidden />
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- cover may be media proxy or CDN
            <img
              src={cover}
              alt=""
              className="relative z-[1] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="relative z-[1] flex h-full items-center justify-center text-brand/70">
              <BookOpen className="size-9" strokeWidth={1.5} aria-hidden />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          {published ? (
            <p className="text-xs font-medium text-charcoal/50">{published}</p>
          ) : null}
          <h2 className="text-balance text-base font-bold tracking-tight text-ink group-hover:text-brand sm:text-lg">
            {item.title}
          </h2>
          {item.excerpt ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/70">
              {item.excerpt}
            </p>
          ) : null}
          {item.tags?.length ? (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-charcoal/70"
                >
                  {tagLabel(tag, locale)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-auto pt-2 text-xs font-semibold text-brand">
              {t("actions.read")}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
