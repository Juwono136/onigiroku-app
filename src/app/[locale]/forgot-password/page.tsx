import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getServerSession, getSessionRole } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/roles";
import { redirect } from "@/i18n/routing";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
      <ForgotPasswordForm />
    </AuthShell>
  );
}
