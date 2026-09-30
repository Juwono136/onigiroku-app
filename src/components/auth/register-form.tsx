"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { registerSchema } from "@/lib/validations/auth";

type Props = {
  googleEnabled: boolean;
  registrationEnabled: boolean;
};

export function RegisterForm({ googleEnabled, registrationEnabled }: Props) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function translateFieldError(code: string) {
    return t(`fieldErrors.${code}`);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    if (!registrationEnabled) {
      toast.error(t("errors.SELF_REGISTRATION_DISABLED"));
      return;
    }

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "name";
        next[key] = translateFieldError(issue.message);
      }
      setFieldErrors(next);
      return;
    }

    startTransition(async () => {
      const result = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: "/dashboard",
        // additionalFields.locale (input: true)
        ...({ locale } as Record<string, string>),
      });

      if (result.error) {
        toast.error(t(`errors.${mapAuthError(result.error)}`));
        return;
      }

      toast.success(t("register.success"));
      router.push(
        `/verify-email?email=${encodeURIComponent(parsed.data.email)}`,
      );
      router.refresh();
    });
  }

  if (!registrationEnabled) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-ink">{t("register.disabledTitle")}</h1>
        <p className="text-sm text-charcoal/75">{t("register.disabledBody")}</p>
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("register.toLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          {t("register.eyebrow")}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("register.title")}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-charcoal/75">
          {t("register.subtitle")}
        </p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleAuthButton
            mode="register"
            callbackURL="/dashboard"
            disabled={pending}
          />
          <div className="relative py-1 text-center text-xs font-medium tracking-wide text-charcoal/45 uppercase">
            <span className="absolute inset-x-0 top-1/2 h-px bg-charcoal/10" aria-hidden />
            <span className="relative bg-white px-3">{t("divider")}</span>
          </div>
        </>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="register-name">{t("fields.name")}</Label>
          <Input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t("placeholders.name")}
            value={name}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl border-charcoal/15 bg-white"
          />
          {fieldErrors.name ? (
            <p className="text-xs text-destructive" role="alert">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-email">{t("fields.email")}</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("placeholders.email")}
            value={email}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border-charcoal/15 bg-white"
          />
          {fieldErrors.email ? (
            <p className="text-xs text-destructive" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <PasswordInput
          id="register-password"
          name="password"
          label={t("fields.password")}
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
          id="register-confirm"
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
              {t("register.submitting")}
            </>
          ) : (
            t("register.submit")
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-charcoal/70">
        {t("register.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("register.toLogin")}
        </Link>
      </p>
    </div>
  );
}
