"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_COOKIE = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistLocaleCookie(locale: "id" | "en") {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: "id" | "en") {
    if (next === locale || pending) return;
    persistLocaleCookie(next);
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-white/80 p-1 text-xs font-semibold shadow-sm backdrop-blur",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {(["id", "en"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-pressed={active}
            aria-label={code === "id" ? "Bahasa Indonesia" : "English"}
            onClick={() => switchTo(code)}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-60",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
