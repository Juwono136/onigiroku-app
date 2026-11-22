import { setRequestLocale } from "next-intl/server";

import { PackageEditor } from "@/components/admin/packages/package-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPackagesNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: "/admin/packages/new" });
  return <PackageEditor />;
}
