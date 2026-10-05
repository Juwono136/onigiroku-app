import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NewsList } from "@/components/news/news-list";
import { defaultLocale } from "@/i18n/routing";
import { parseNewsTagList } from "@/lib/news/query";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const canonical = `${site}${prefix}/news`;

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: { canonical },
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
      url: canonical,
      type: "website",
    },
  };
}

export default async function NewsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tag?: string | string[];
    tags?: string | string[];
    page?: string;
    q?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const selectedTags = parseNewsTagList([
    ...(Array.isArray(sp.tags) ? sp.tags : sp.tags ? [sp.tags] : []),
    ...(Array.isArray(sp.tag) ? sp.tag : sp.tag ? [sp.tag] : []),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <NewsList
          locale={locale}
          tags={selectedTags}
          page={page}
          search={(sp.q ?? "").trim()}
        />
      </main>
      <SiteFooter />
    </>
  );
}
