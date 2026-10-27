import { setRequestLocale } from "next-intl/server";

import { CategoryBoard } from "@/components/admin/learning/category-board";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: "/admin/learning" });
  return <CategoryBoard />;
}
