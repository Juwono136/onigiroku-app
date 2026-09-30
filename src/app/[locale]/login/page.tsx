import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthConfigured } from "@/lib/auth/flags";
import { getServerSession, getSessionRole } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/roles";
import { redirect } from "@/i18n/routing";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  setRequestLocale(locale);

  const session = await getServerSession();
  if (session) {
    redirect({
      href: getDashboardPath(getSessionRole(session)),
      locale,
    });
  }

  return (
    <AuthShell>
      <LoginForm
        googleEnabled={isGoogleAuthConfigured()}
        callbackUrl={callbackUrl}
      />
    </AuthShell>
  );
}
