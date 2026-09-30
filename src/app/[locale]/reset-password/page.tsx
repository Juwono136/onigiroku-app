import { setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { token, error } = await searchParams;
  setRequestLocale(locale);
  await redirectIfAuthenticated(locale);

  return (
    <AuthShell>
      <ResetPasswordForm token={token ?? null} errorCode={error ?? null} />
    </AuthShell>
  );
}
