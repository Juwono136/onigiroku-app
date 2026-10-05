import { setRequestLocale } from "next-intl/server";

import { MaterialEditor } from "@/components/admin/materials/material-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminMaterialsEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", {
    locale,
    callbackPath: `/admin/materials/${id}`,
  });

  return <MaterialEditor mode="edit" materialId={id} />;
}
