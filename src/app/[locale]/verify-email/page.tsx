import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { getDashboardPath } from "@/lib/auth/roles";
import {
  getServerSession,
  getSessionRole,
} from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  const { email } = await searchParams;
  setRequestLocale(locale);

  const session = await getServerSession();
  // Verified sessions belong on the dashboard, not auth screens.
  if (session?.user.emailVerified) {
    const path = getDashboardPath(getSessionRole(session));
    redirect(locale !== "id" ? `/${locale}${path}` : path);
  }

  return (
    <AuthShell>
      <VerifyEmailPanel email={email ?? session?.user.email ?? null} />
    </AuthShell>
  );
}
