import { setRequestLocale } from "next-intl/server";

import { PackageEditor } from "@/components/admin/packages/package-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPackagesEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: `/admin/packages/${id}` });
  return <PackageEditor packageId={id} />;
}
