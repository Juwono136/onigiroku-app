"use client";

import { Loader2, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";

type Props = {
  email?: string | null;
};

export function VerifyEmailPanel({ email }: Props) {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();

  function onResend() {
    if (!email) {
      toast.error(t("verify.missingEmail"));
      return;
    }

    startTransition(async () => {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        toast.error(t(`errors.${mapAuthError(result.error)}`));
        return;
      }

      toast.success(t("verify.resent"));
    });
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <MailCheck className="size-7" aria-hidden />
      </div>
      <div>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("verify.title")}
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-charcoal/75">
          {email
            ? t("verify.subtitleWithEmail", { email })
            : t("verify.subtitle")}
        </p>
      </div>

      {email ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onResend}
          className="h-11 w-full rounded-xl font-semibold"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("verify.resending")}
            </>
          ) : (
            t("verify.resend")
          )}
        </Button>
      ) : null}

      <p className="text-sm text-charcoal/70">
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("verify.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
