import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { getServerSession, getSessionRole } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/roles";
import { redirect } from "@/i18n/routing";

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
  if (session?.user.emailVerified) {
    redirect({
      href: getDashboardPath(getSessionRole(session)),
      locale,
    });
  }

  return (
    <AuthShell>
      <VerifyEmailPanel email={email ?? session?.user.email ?? null} />
    </AuthShell>
  );
}
