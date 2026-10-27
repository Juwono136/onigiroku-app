import { setRequestLocale } from "next-intl/server";

import { MaterialEditor } from "@/components/admin/materials/material-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLessonEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; lessonId: string }>;
}) {
  const { locale, id, lessonId } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", {
    locale,
    callbackPath: `/admin/learning/${id}/lessons/${lessonId}`,
  });
  return (
    <MaterialEditor
      mode="edit"
      materialId={lessonId}
      surface="lesson"
      categoryId={id}
    />
  );
}
