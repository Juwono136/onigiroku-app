import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NewsArticle } from "@/components/news/news-article";
import { goGetNews } from "@/lib/api/go-materials";
import { defaultLocale } from "@/i18n/routing";
import { resolveMaterialSeo } from "@/lib/materials/locale";
import { toBrowserMediaUrl } from "@/lib/storage";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function siteCanonical(locale: string, path: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${site}${prefix}${path}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "news" });

  try {
    const material = await goGetNews(slug);
    const seo = resolveMaterialSeo(material, locale);
    const title = seo.title || t("meta.title");
    const description = seo.description || t("meta.description");
    const canonical = siteCanonical(locale, `/news/${slug}`);
    const cover = toBrowserMediaUrl(material.coverUrl);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "article",
        images: cover ? [{ url: cover }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: cover ? [cover] : undefined,
      },
    };
  } catch {
    return {
      title: t("notFound"),
      description: t("meta.description"),
    };
  }
}

export default async function NewsDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let material;
  try {
    material = await goGetNews(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <NewsArticle material={material} locale={locale} />
      </main>
      <SiteFooter />
    </>
  );
}
