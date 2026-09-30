"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message ?? "EMAIL_INVALID";
      setFieldError(t(`fieldErrors.${code}`));
      toast.error(t(`fieldErrors.${code}`));
      return;
    }

    startTransition(async () => {
      const result = await authClient.requestPasswordReset({
        email: parsed.data.email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        const code = mapAuthError(result.error);
        // Avoid email enumeration: still show success for unknown emails when API is opaque.
        if (code === "USER_NOT_FOUND") {
          setSent(true);
          toast.success(t("forgot.success"));
          return;
        }
        toast.error(t(`errors.${code}`));
        return;
      }

      setSent(true);
      toast.success(t("forgot.success"));
    });
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {t("forgot.sentTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-charcoal/75">
          {t("forgot.sentBody")}
        </p>
        <Link href="/login" className="inline-flex font-semibold text-brand hover:underline">
          {t("forgot.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          {t("forgot.eyebrow")}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("forgot.title")}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-charcoal/75">
          {t("forgot.subtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">{t("fields.email")}</Label>
          <Input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("placeholders.email")}
            value={email}
            disabled={pending}
            aria-invalid={Boolean(fieldError)}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border-charcoal/15 bg-white"
          />
          {fieldError ? (
            <p className="text-xs text-destructive" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl font-semibold"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("forgot.submitting")}
            </>
          ) : (
            t("forgot.submit")
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-charcoal/70">
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("forgot.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
