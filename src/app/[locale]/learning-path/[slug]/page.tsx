import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CourseDetail } from "@/components/courses/course-detail";
import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { defaultLocale } from "@/i18n/routing";
import { goPublicGetCourse } from "@/lib/api/go-learning";
import { getServerSession, getSessionRole } from "@/lib/auth/session";
import { plainExcerpt } from "@/lib/learning/rich-text";
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

function metaDescription(raw: string) {
  const text = plainExcerpt(raw);
  if (text.length <= 180) return text;
  const slice = text.slice(0, 180).replace(/\s+\S*$/, "").trim();
  return `${slice || text.slice(0, 180)}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "courses" });

  try {
    const course = await goPublicGetCourse(
      slug,
      locale === "en" ? "en" : "id",
    );
    const title =
      locale === "en" ? course.nameEn || course.nameId : course.nameId;
    const description =
      metaDescription(
        locale === "en"
          ? course.descriptionEn || course.descriptionId
          : course.descriptionId,
      ) || t("meta.description");
    const canonical = siteCanonical(locale, `/learning-path/${slug}`);
    const cover = toBrowserMediaUrl(course.coverUrl);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
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

export default async function CourseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let course;
  try {
    course = await goPublicGetCourse(slug, locale === "en" ? "en" : "id");
  } catch {
    notFound();
  }

  const session = await getServerSession();
  const role = session ? getSessionRole(session) : null;
  const isStudent = role === "USER" || role === "ADMIN";

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <CourseDetail course={course} locale={locale} isStudent={isStudent} />
      </main>
      <SiteFooter />
    </>
  );
}
