import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ClassesList } from "@/components/classes/classes-list";
import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { defaultLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "classesPage" });
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const canonical = `${site}${prefix}/classes`;
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

export default async function ClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <ClassesList
          locale={locale}
          page={page}
          search={(sp.q ?? "").trim().slice(0, 120)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
