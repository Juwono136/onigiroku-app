"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import {
  clearRememberMe,
  loadRememberMe,
  saveRememberMe,
} from "@/lib/auth/remember-me";
import { getDashboardPath } from "@/lib/auth/roles";
import { loginSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

type Props = {
  googleEnabled: boolean;
  callbackUrl?: string;
  /** OAuth callback error query (e.g. account_not_linked). */
  oauthError?: string;
};

export function LoginForm({ googleEnabled, callbackUrl, oauthError }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = loadRememberMe();
      if (saved) {
        setEmail(saved.email);
        setPassword(saved.password);
        setRememberMe(true);
      } else {
        setRememberMe(false);
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!oauthError) return;
    const frame = requestAnimationFrame(() => {
      toast.error(t(`errors.${mapAuthError(oauthError)}`));
    });
    return () => cancelAnimationFrame(frame);
  }, [oauthError, t]);

  function translateFieldError(code: string) {
    return t(`fieldErrors.${code}`);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "email";
        next[key] = translateFieldError(issue.message);
      }
      setFieldErrors(next);
      return;
    }

    startTransition(async () => {
      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result.error) {
        const code = mapAuthError(result.error);
        toast.error(t(`errors.${code}`));
        if (code === "EMAIL_NOT_VERIFIED") {
          router.push(
            `/verify-email?email=${encodeURIComponent(parsed.data.email)}`,
          );
        }
        return;
      }

      if (rememberMe) {
        saveRememberMe({
          email: parsed.data.email,
          password: parsed.data.password,
        });
      } else {
        clearRememberMe();
      }

      toast.success(t("login.success"));

      if (callbackUrl && callbackUrl.startsWith("/")) {
        router.push(callbackUrl as "/dashboard");
        router.refresh();
        return;
      }

      const session = await authClient.getSession();
      const role = (session.data?.user as { role?: string } | undefined)?.role;
      router.push(getDashboardPath(role));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          {t("login.eyebrow")}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("login.title")}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-charcoal/75">
          {t("login.subtitle")}
        </p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleAuthButton
            mode="login"
            callbackURL={
              callbackUrl && callbackUrl.startsWith("/")
                ? callbackUrl
                : "/dashboard"
            }
            disabled={pending}
          />
          <div className="relative py-1 text-center text-xs font-medium tracking-wide text-charcoal/45 uppercase">
            <span
              className="absolute inset-x-0 top-1/2 h-px bg-charcoal/10"
              aria-hidden
            />
            <span className="relative bg-white px-3">{t("divider")}</span>
          </div>
        </>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">{t("fields.email")}</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("placeholders.email")}
            value={email}
            disabled={pending || !hydrated}
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
          id="login-password"
          label={t("fields.password")}
          value={password}
          onChange={setPassword}
          placeholder={t("placeholders.password")}
          autoComplete="current-password"
          disabled={pending || !hydrated}
          error={fieldErrors.password}
          showLabel={t("password.show")}
          hideLabel={t("password.hide")}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="login-remember"
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 text-sm text-charcoal/80 select-none",
              (pending || !hydrated) && "pointer-events-none opacity-60",
            )}
          >
            <input
              id="login-remember"
              name="rememberMe"
              type="checkbox"
              checked={rememberMe}
              disabled={pending || !hydrated}
              onChange={(event) => {
                const next = event.target.checked;
                setRememberMe(next);
                if (!next) clearRememberMe();
              }}
              className="size-4 cursor-pointer rounded border-charcoal/30 text-brand accent-brand focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            <span>{t("login.rememberMe")}</span>
          </label>

          <Link
            href="/forgot-password"
            className="cursor-pointer text-sm font-medium text-brand hover:underline"
          >
            {t("login.forgot")}
          </Link>
        </div>

        <Button
          type="submit"
          disabled={pending || !hydrated}
          className="h-11 w-full cursor-pointer rounded-xl font-semibold"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("login.submitting")}
            </>
          ) : (
            t("login.submit")
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-charcoal/70">
        {t("login.noAccount")}{" "}
        <Link
          href="/register"
          className="cursor-pointer font-semibold text-brand hover:underline"
        >
          {t("login.toRegister")}
        </Link>
      </p>
    </div>
  );
}
