import { ArrowLeft, CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { MaterialTiptapViewer } from "@/components/materials/material-tiptap-viewer";
import { ShareLinkButton } from "@/components/news/share-link-button";
import { buttonVariants } from "@/components/ui/button";
import { Link, defaultLocale } from "@/i18n/routing";
import { pickMaterialLocale } from "@/lib/materials/locale";
import type { MaterialDetail } from "@/lib/materials/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  material: MaterialDetail;
  locale: string;
  backHref?: "/dashboard/materials" | "/news";
  backLabel?: string;
  eyebrow?: string;
  /** Hide auto-derived excerpt under the title (recommended for long-form readers). */
  showExcerpt?: boolean;
  /** Wider article column for tables / media-heavy news. */
  wide?: boolean;
  /** Show share control (public news). */
  shareUrl?: string;
};

function formatDate(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function absoluteShareUrl(locale: string, path: string) {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${site}${prefix}${path}`;
}

export async function MaterialReader({
  material,
  locale,
  backHref = "/dashboard/materials",
  backLabel,
  eyebrow,
  showExcerpt = false,
  wide = false,
  shareUrl,
}: Props) {
  const t = await getTranslations("studentMaterials");
  const loc = pickMaterialLocale(material, locale);
  const cover = toBrowserMediaUrl(material.coverUrl);
  const published = formatDate(material.publishedAt, locale);
  const tags = material.tags ?? [];
  const resolvedShare =
    shareUrl ??
    (backHref === "/news"
      ? absoluteShareUrl(locale, `/news/${material.slug}`)
      : undefined);

  return (
    <article className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-seigaiha opacity-[0.14]"
        aria-hidden
      />

      <div
        className={cn(
          "relative mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8",
          wide ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 cursor-pointer gap-1.5 rounded-xl px-2.5 text-charcoal/70 hover:text-ink",
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel ?? t("actions.backToList")}
          </Link>
          {resolvedShare ? (
            <ShareLinkButton url={resolvedShare} title={loc.title} />
          ) : null}
        </div>

        <header className="mb-8 w-full">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {eyebrow ?? t("reader.eyebrow")}
          </p>
          <h1 className="font-jp mt-2 w-full max-w-none text-pretty text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {loc.title}
          </h1>
          {showExcerpt && loc.excerpt ? (
            <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-charcoal/75 sm:text-lg">
              {loc.excerpt}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm text-charcoal/60">
            {published ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white/80 px-2.5 py-1">
                <CalendarDays className="size-3.5" aria-hidden />
                {published}
              </span>
            ) : null}
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`${backHref}?tag=${encodeURIComponent(tag.slug)}`}
                className="rounded-full border border-charcoal/12 bg-white/80 px-2.5 py-1 text-xs font-semibold text-charcoal/75 transition-colors hover:border-brand/30 hover:text-brand"
              >
                {locale === "en"
                  ? tag.nameEn || tag.nameId
                  : tag.nameId || tag.nameEn}
              </Link>
            ))}
          </div>
        </header>

        {cover ? (
          <div className="mb-8 overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-soft shadow-[0_22px_48px_-34px_rgba(15,23,42,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <div className="rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] px-4 py-5 shadow-[0_16px_40px_-32px_rgba(67,64,64,0.55)] sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <MaterialTiptapViewer content={loc.body} enableImageZoom />
        </div>
      </div>
    </article>
  );
}
