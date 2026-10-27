import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LessonPractice } from "@/components/learning/lesson-practice";
import { StudyFocus } from "@/components/learning/study-focus";
import { MaterialReader } from "@/components/materials/material-reader";
import { Link } from "@/i18n/routing";
import { goStudentGetMaterial } from "@/lib/api/go-materials";
import {
  getSessionRole,
  getSessionUser,
  requireAnyRole,
} from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function StudentMaterialReaderPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const session = await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: `/dashboard/materials/${slug}`,
  });
  const user = getSessionUser(session);
  const role = getSessionRole(session);
  const t = await getTranslations("learningStudent");

  let view;
  let locked = false;
  try {
    view = await goStudentGetMaterial(
      user.id,
      role,
      slug,
      locale === "en" ? "en" : "id",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "LESSON_LOCKED") {
      locked = true;
    } else {
      notFound();
    }
  }

  if (locked || !view) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <StudyFocus />
        <h1 className="text-2xl font-bold text-ink">{t("locked.title")}</h1>
        <p className="mt-2 text-sm text-charcoal/65">{t("locked.description")}</p>
        <Link href="/dashboard/materials" className="mt-6 inline-flex text-sm font-semibold text-brand">
          {t("actions.back")}
        </Link>
      </div>
    );
  }

  return (
    <>
    <StudyFocus />
    <MaterialReader
      material={view.material}
      locale={locale}
      backHref={`/dashboard/materials/categories/${view.categorySlug}`}
      backLabel={t("actions.backToPath")}
      footer={
        <LessonPractice
          slug={slug}
          questions={view.questions}
          shuffleQuestions={Boolean(view.material.shuffleQuestions)}
          shuffleChoices={Boolean(view.material.shuffleChoices)}
          completed={view.progress.completed}
          lessonCount={view.lessonCount}
          completedCount={view.completedCount}
          nextSlug={view.nextSlug}
          nextLocked={view.nextLocked}
        />
      }
    />
    </>
  );
}
