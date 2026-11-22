import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isGoogleAuthConfigured,
  isSelfRegistrationEnabled,
} from "@/lib/auth/flags";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { safeCallbackPath } from "@/lib/packages/buy-intent";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);

  return (
    <AuthShell maxWidthClassName="max-w-lg">
      <RegisterForm
        googleEnabled={isGoogleAuthConfigured()}
        registrationEnabled={isSelfRegistrationEnabled()}
        callbackUrl={safeCallbackPath(callbackUrl)}
      />
    </AuthShell>
  );
}
