import { setRequestLocale } from "next-intl/server";

import { PurchaseIntentModal } from "@/components/classes/purchase-intent-modal";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { redirect } from "@/i18n/routing";
import {
  getServerSession,
  getSessionRole,
  requireRole,
} from "@/lib/auth/session";
import { checkoutPath, parseBuySlug } from "@/lib/packages/buy-intent";

export default async function StudentDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ buy?: string | string[] }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const buySlug = parseBuySlug(sp.buy);

  // Admins land on /admin after login; keep their buy intent by going straight to checkout.
  if (buySlug) {
    const current = await getServerSession({ fresh: true });
    if (current && getSessionRole(current) === "ADMIN") {
      redirect({ href: checkoutPath(buySlug), locale });
    }
  }

  const session = await requireRole("USER", {
    locale,
    callbackPath: buySlug
      ? `/dashboard?buy=${encodeURIComponent(buySlug)}`
      : "/dashboard",
  });

  return (
    <>
      <DashboardHome session={session} locale={locale} role="USER" />
      <PurchaseIntentModal buySlug={buySlug} />
    </>
  );
}
