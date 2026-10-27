import { setRequestLocale } from "next-intl/server";

import { CategoryEditor } from "@/components/admin/learning/category-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLearningNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: "/admin/learning/new" });
  return <CategoryEditor />;
}
