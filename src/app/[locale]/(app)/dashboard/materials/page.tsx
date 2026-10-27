import { setRequestLocale } from "next-intl/server";

import { StudentCategoryGrid } from "@/components/learning/student-category-grid";
import { requireAnyRole } from "@/lib/auth/session";

export default async function StudentMaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: "/dashboard/materials",
  });
  return <StudentCategoryGrid />;
}
