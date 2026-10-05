import { setRequestLocale } from "next-intl/server";

import { MaterialsManagement } from "@/components/admin/materials/materials-management";
import { requireRole } from "@/lib/auth/session";

export default async function AdminMaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", {
    locale,
    callbackPath: "/admin/materials",
  });

  return <MaterialsManagement />;
}
