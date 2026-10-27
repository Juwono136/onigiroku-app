import { setRequestLocale } from "next-intl/server";

import { CategoryEditor } from "@/components/admin/learning/category-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLearningEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: `/admin/learning/${id}` });
  return <CategoryEditor categoryId={id} />;
}
