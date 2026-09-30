import { setRequestLocale } from "next-intl/server";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole("ADMIN", {
    locale,
    callbackPath: "/admin",
  });

  return <DashboardHome session={session} locale={locale} role="ADMIN" />;
}
