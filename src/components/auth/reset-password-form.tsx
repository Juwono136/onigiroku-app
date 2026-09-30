"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { resetPasswordSchema } from "@/lib/validations/auth";

type Props = {
  token: string | null;
  errorCode?: string | null;
};

export function ResetPasswordForm({ token, errorCode }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (errorCode || !token) {
    return (
      <div className="space-y-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {t("reset.invalidTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-charcoal/75">
          {t("reset.invalidBody")}
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex font-semibold text-brand hover:underline"
        >
          {t("reset.requestAgain")}
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
      token,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "password";
        next[key] = t(`fieldErrors.${issue.message}`);
      }
      setFieldErrors(next);
      return;
    }

    startTransition(async () => {
      const result = await authClient.resetPassword({
        newPassword: parsed.data.password,
        token: parsed.data.token,
      });

      if (result.error) {
        toast.error(t(`errors.${mapAuthError(result.error)}`));
        return;
      }

      toast.success(t("reset.success"));
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          {t("reset.eyebrow")}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("reset.title")}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-charcoal/75">
          {t("reset.subtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <PasswordInput
          id="reset-password"
          label={t("fields.newPassword")}
          value={password}
          onChange={setPassword}
          placeholder={t("placeholders.newPassword")}
          autoComplete="new-password"
          disabled={pending}
          error={fieldErrors.password}
          showLabel={t("password.show")}
          hideLabel={t("password.hide")}
        />
        <PasswordInput
          id="reset-confirm"
          name="confirmPassword"
          label={t("fields.confirmPassword")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder={t("placeholders.confirmPassword")}
          autoComplete="new-password"
          disabled={pending}
          error={fieldErrors.confirmPassword}
          showLabel={t("password.show")}
          hideLabel={t("password.hide")}
        />

        <p className="text-xs leading-relaxed text-charcoal/55">
          {t("register.passwordHint")}
        </p>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl font-semibold"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("reset.submitting")}
            </>
          ) : (
            t("reset.submit")
          )}
        </Button>
      </form>
    </div>
  );
}
