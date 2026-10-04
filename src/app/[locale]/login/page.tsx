import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthConfigured } from "@/lib/auth/flags";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl, error } = await searchParams;
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);

  return (
    <AuthShell>
      <LoginForm
        googleEnabled={isGoogleAuthConfigured()}
        callbackUrl={callbackUrl}
        oauthError={error}
      />
    </AuthShell>
  );
}
