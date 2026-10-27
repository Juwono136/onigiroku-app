import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { StudentPath } from "@/components/learning/student-path";
import { StudyFocus } from "@/components/learning/study-focus";
import { goStudentGetCategory } from "@/lib/api/go-learning";
import {
  getSessionRole,
  getSessionUser,
  requireAnyRole,
} from "@/lib/auth/session";

export default async function StudentCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const session = await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: `/dashboard/materials/categories/${slug}`,
  });
  let category;
  try {
    category = await goStudentGetCategory(
      getSessionUser(session).id,
      getSessionRole(session),
      slug,
      locale === "en" ? "en" : "id",
    );
  } catch {
    notFound();
  }

  return (
    <>
      <StudyFocus />
      <StudentPath category={category} locale={locale} />
    </>
  );
}
