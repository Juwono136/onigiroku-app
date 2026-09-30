import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);

  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
