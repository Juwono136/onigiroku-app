import { setRequestLocale } from "next-intl/server";

import { MaterialEditor } from "@/components/admin/materials/material-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLessonNewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", {
    locale,
    callbackPath: `/admin/learning/${id}/lessons/new`,
  });
  return <MaterialEditor mode="create" surface="lesson" categoryId={id} />;
}
