import { ArrowRight, Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { goListNews } from "@/lib/api/go-materials";
import type { MaterialListItem, MaterialTag } from "@/lib/materials/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  excludeSlug: string;
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

/** Latest public news cards + CTA back to the news list (detail footer). */
export async function NewsRelated({ locale, excludeSlug }: Props) {
  const t = await getTranslations("news");

  let items: MaterialListItem[] = [];
  try {
    const data = await goListNews({
      page: 1,
      pageSize: 6,
      locale: locale === "en" ? "en" : "id",
      sortBy: "publishedAt",
      sortDir: "desc",
    });
    items = data.items
      .filter((item) => item.slug !== excludeSlug)
      .slice(0, 3);
  } catch {
    items = [];
  }

  return (
    <section className="mt-12 border-t border-charcoal/10 pt-10 sm:mt-14 sm:pt-12">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {t("related.eyebrow")}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
            {t("related.title")}
          </h2>
          <p className="max-w-xl text-sm text-charcoal/65">
            {t("related.subtitle")}
          </p>
        </div>
        <Link
          href="/news"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 w-fit cursor-pointer gap-2 rounded-2xl px-4 font-semibold",
          )}
        >
          {t("related.viewAll")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-charcoal/15 bg-white/70 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-ink">{t("related.empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const cover = toBrowserMediaUrl(item.coverUrl);
            const published = formatDate(item.publishedAt, locale);
            const primaryTag = item.tags?.[0];
            return (
              <li key={item.id}>
                <Link
                  href={`/news/${item.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_18px_40px_-34px_rgba(24,24,27,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_26px_48px_-30px_rgba(24,24,27,0.45)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-brand/35">
                        <Newspaper className="size-9" aria-hidden />
                      </div>
                    )}
                    {primaryTag ? (
                      <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
                        {tagLabel(primaryTag, locale)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                    {published ? (
                      <p className="text-[11px] font-semibold tracking-[0.12em] text-charcoal/45 uppercase">
                        {published}
                      </p>
                    ) : null}
                    <h3 className="font-jp line-clamp-2 text-base font-bold tracking-tight text-ink transition-colors group-hover:text-brand sm:text-lg">
                      {item.title}
                    </h3>
                    {item.excerpt ? (
                      <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/65">
                        {item.excerpt}
                      </p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand">
                      {t("actions.read")}
                      <ArrowRight
                        className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex justify-center sm:mt-10">
        <Link
          href="/news"
          className={cn(
            buttonVariants(),
            "h-12 cursor-pointer gap-2 rounded-2xl px-6 font-semibold shadow-sm",
          )}
        >
          {t("related.backToList")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
