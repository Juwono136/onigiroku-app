import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoonPage } from "@/components/courses/coming-soon-page";
import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { defaultLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutPage" });
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: { canonical: `${site}${prefix}/about` },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutPage");

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <ComingSoonPage
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          ctaLabel={t("cta")}
          ctaHref="/learning-path"
        />
      </main>
      <SiteFooter />
    </>
  );
}
