import { ArrowRight, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NewsSearchBar } from "@/components/news/news-search-bar";
import { NewsTagFilter } from "@/components/news/news-tag-filter";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { goListNews, goListNewsTags } from "@/lib/api/go-materials";
import type { MaterialListItem, MaterialTag } from "@/lib/materials/types";
import { newsListHref } from "@/lib/news/query";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  tags?: string[];
  page?: number;
  search?: string;
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

export async function NewsList({
  locale,
  tags = [],
  page = 1,
  search = "",
}: Props) {
  const t = await getTranslations("news");
  const pageSize = 9;

  let items: MaterialListItem[] = [];
  let totalPages = 1;
  let error: string | null = null;
  let filterTags: MaterialTag[] = [];

  try {
    const [data, catalog] = await Promise.all([
      goListNews({
        page,
        pageSize,
        tags,
        search,
        locale: locale === "en" ? "en" : "id",
        sortBy: "publishedAt",
        sortDir: "desc",
        visibility: "PUBLIC",
        status: "PUBLISHED",
      }),
      goListNewsTags(80),
    ]);
    items = data.items;
    totalPages = Math.max(1, data.totalPages);
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

        <div className="mb-8 space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-white/85 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] backdrop-blur sm:p-5">
          <NewsSearchBar
            key={`${search}::${tags.join(",")}`}
            locale={locale}
            initialSearch={search}
            tags={tags}
          />
          <NewsTagFilter
            locale={locale}
            tags={filterTags}
            selectedTags={tags}
            search={search}
            visibleCount={8}
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-charcoal/15 bg-white/70 px-6 py-16 text-center">
            <p className="text-base font-semibold text-ink">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-charcoal/65">{t("empty.description")}</p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const cover = toBrowserMediaUrl(item.coverUrl);
              const published = formatDate(item.publishedAt, locale);
              const primaryTag = item.tags?.[0];
              return (
                <li key={item.id}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-charcoal/10 bg-white shadow-[0_22px_48px_-36px_rgba(24,24,27,0.55)] transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/25 hover:shadow-[0_32px_56px_-30px_rgba(24,24,27,0.5)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-soft to-white text-brand/35">
                          <Newspaper className="size-10" aria-hidden />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/5 to-transparent opacity-90" />
                      {primaryTag ? (
                        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
                          {tagLabel(primaryTag, locale)}
                        </span>
                      ) : null}
                      {published ? (
                        <p className="absolute bottom-3 left-3 text-[11px] font-semibold tracking-[0.14em] text-white/90 uppercase drop-shadow">
                          {published}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
                      <h2 className="font-jp text-lg font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-[1.2rem] sm:leading-snug">
                        {item.title}
                      </h2>
                      {item.excerpt ? (
                        <p className="line-clamp-3 text-sm leading-relaxed text-charcoal/70">
                          {item.excerpt}
                        </p>
                      ) : null}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-brand">
                        {t("actions.read")}
                        <ArrowRight
                          aria-hidden
                          className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label={t("pagination.label")}
            className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-charcoal/10 pt-6 sm:justify-between"
          >
            <Link
              href={newsListHref({ page: page - 1, tags, search })}
              aria-disabled={page <= 1}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 gap-1 rounded-xl font-semibold",
                page <= 1 && "pointer-events-none opacity-40",
              )}
            >
              <ChevronLeft className="size-4" aria-hidden />
              {t("pagination.prev")}
            </Link>
            <span className="min-w-24 text-center text-sm font-semibold text-ink">
              {t("pagination.pageOf", {
                page,
                totalPages,
              })}
            </span>
            <Link
              href={newsListHref({ page: page + 1, tags, search })}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 gap-1 rounded-xl font-semibold",
                page >= totalPages && "pointer-events-none opacity-40",
              )}
            >
              {t("pagination.next")}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
