import { setRequestLocale } from "next-intl/server";

import { PackageBoard } from "@/components/admin/packages/package-board";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: "/admin/packages" });
  return <PackageBoard />;
}
