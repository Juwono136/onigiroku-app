"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { mapAuthError } from "@/lib/auth/errors";
import { clearRememberMe } from "@/lib/auth/remember-me";
import { changePasswordSchema } from "@/lib/validations/settings";

export function PasswordSettingsForm() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function fieldError(code: string) {
    try {
      return tAuth(`fieldErrors.${code}`);
    } catch {
      return code;
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "newPassword";
        next[key] = fieldError(issue.message);
      }
      setFieldErrors(next);
      const first = Object.values(next)[0];
      if (first) toast.error(first);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const payload = (await res.json()) as {
          success?: boolean;
          error?: { message?: string; code?: string };
        };

        if (!res.ok || !payload.success) {
          const mapped = mapAuthError(payload.error?.message ?? payload.error);
          if (mapped === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
            toast.error(t("password.noCredential"));
          } else if (
            mapped === "INVALID_PASSWORD" ||
            mapped === "INVALID_EMAIL_OR_PASSWORD"
          ) {
            toast.error(t("password.currentWrong"));
            setFieldErrors({ currentPassword: t("password.currentWrong") });
          } else {
            toast.error(tAuth(`errors.${mapped}`));
          }
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        clearRememberMe();
        toast.success(t("password.success"));
      } catch {
        toast.error(t("errors.GENERIC"));
      }
    });
  }

  return (
    <section className="jp-rail rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-5 shadow-[0_14px_36px_-30px_rgba(67,64,64,0.5)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">{t("password.title")}</h2>
          <p className="mt-1 text-sm text-charcoal/65">{t("password.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
        <PasswordInput
          id="settings-current-password"
          name="currentPassword"
          label={t("password.current")}
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder={t("password.currentPlaceholder")}
          autoComplete="current-password"
          disabled={pending}
          error={fieldErrors.currentPassword}
          showLabel={tAuth("password.show")}
          hideLabel={tAuth("password.hide")}
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <PasswordInput
            id="settings-new-password"
            name="newPassword"
            label={t("password.new")}
            value={newPassword}
            onChange={setNewPassword}
            placeholder={t("password.newPlaceholder")}
            autoComplete="new-password"
            disabled={pending}
            error={fieldErrors.newPassword}
            showLabel={tAuth("password.show")}
            hideLabel={tAuth("password.hide")}
          />
          <PasswordInput
            id="settings-confirm-password"
            name="confirmPassword"
            label={t("password.confirm")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder={t("password.confirmPlaceholder")}
            autoComplete="new-password"
            disabled={pending}
            error={fieldErrors.confirmPassword}
            showLabel={tAuth("password.show")}
            hideLabel={tAuth("password.hide")}
          />
        </div>

        <p className="text-[11px] leading-relaxed text-charcoal/50">
          {tAuth("register.passwordHint")}
        </p>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full cursor-pointer rounded-xl font-semibold sm:w-auto sm:min-w-[11rem]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("password.submitting")}
            </>
          ) : (
            t("password.submit")
          )}
        </Button>
      </form>
    </section>
  );
}
