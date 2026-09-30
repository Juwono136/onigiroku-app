"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { cn } from "@/lib/utils";

type Props = {
  mode: "login" | "register";
  callbackURL: string;
  disabled?: boolean;
  className?: string;
};

/** Official multicolor Google "G" mark */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  mode,
  callbackURL,
  disabled,
  className,
}: Props) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (result.error) {
        toast.error(t(`errors.${mapAuthError(result.error)}`));
        setPending(false);
      }
    } catch (error) {
      toast.error(t(`errors.${mapAuthError(error)}`));
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      className={cn(
        "group relative flex h-12 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl border border-[#dadce0] bg-white px-4 text-[15px] font-semibold text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.08),0_1px_3px_1px_rgba(60,64,67,0.08)] transition-[background-color,box-shadow,border-color,transform] duration-200",
        "hover:border-[#c6c8cc] hover:bg-[#f8f9fa] hover:shadow-[0_2px_6px_rgba(60,64,67,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "active:translate-y-px active:shadow-sm",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:shadow-[0_1px_2px_rgba(60,64,67,0.08),0_1px_3px_1px_rgba(60,64,67,0.08)]",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
        aria-hidden
      />
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-[#5f6368]" aria-hidden />
        ) : (
          <GoogleMark className="size-[18px]" />
        )}
      </span>
      <span className="relative tracking-tight">
        {mode === "login" ? t("google.login") : t("google.register")}
      </span>
    </button>
  );
}
