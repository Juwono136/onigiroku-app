import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isGoogleAuthConfigured,
  isSelfRegistrationEnabled,
} from "@/lib/auth/flags";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);

  return (
    <AuthShell maxWidthClassName="max-w-lg">
      <RegisterForm
        googleEnabled={isGoogleAuthConfigured()}
        registrationEnabled={isSelfRegistrationEnabled()}
      />
    </AuthShell>
  );
}
