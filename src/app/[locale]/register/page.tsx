import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isGoogleAuthConfigured,
  isSelfRegistrationEnabled,
} from "@/lib/auth/flags";
import { getServerSession, getSessionRole } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/roles";
import { redirect } from "@/i18n/routing";

export default async function RegisterPage({
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
    <AuthShell maxWidthClassName="max-w-lg">
      <RegisterForm
        googleEnabled={isGoogleAuthConfigured()}
        registrationEnabled={isSelfRegistrationEnabled()}
      />
    </AuthShell>
  );
}
