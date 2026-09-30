import { setRequestLocale } from "next-intl/server";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { requireRole } from "@/lib/auth/session";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole("USER", {
    locale,
    callbackPath: "/dashboard",
  });

  return <DashboardHome session={session} locale={locale} role="USER" />;
}
