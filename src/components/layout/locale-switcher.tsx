"use client";

import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_COOKIE = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const LOCALES = [
  { code: "id" as const, labelKey: "id" as const },
  { code: "en" as const, labelKey: "en" as const },
];

function persistLocaleCookie(locale: "id" | "en") {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

type Props = {
  className?: string;
  /**
   * pills — segmented control (landing / desktop)
   * menu — compact dropdown (space-constrained)
   * auto — menu below `sm`, pills from `sm` up
   */
  variant?: "pills" | "menu" | "auto";
};

export function LocaleSwitcher({ className, variant = "pills" }: Props) {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: "id" | "en") {
    if (next === locale || pending) return;
    persistLocaleCookie(next);
    // Defer navigation so Base UI can release pointer capture cleanly.
    window.setTimeout(() => {
      startTransition(() => {
        router.replace(pathname, { locale: next });
      });
    }, 0);
  }

  const pills = (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-white/80 p-1 text-xs font-semibold shadow-sm backdrop-blur",
        className,
      )}
      role="group"
      aria-label={t("label")}
    >
      {LOCALES.map(({ code }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-pressed={active}
            aria-label={t(code)}
            onClick={() => switchTo(code)}
            className={cn(
              "h-7 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-60",
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

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label={t("label")}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-9 cursor-pointer gap-1.5 rounded-xl px-2.5 font-semibold",
          className,
        )}
      >
        <Languages className="size-3.5 shrink-0" aria-hidden />
        <span className="text-xs uppercase tracking-wide">
          {locale.toUpperCase()}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[10.5rem] rounded-xl border-charcoal/10 p-1.5 shadow-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-charcoal/50 uppercase">
            {t("label")}
          </DropdownMenuLabel>
          {LOCALES.map(({ code }) => {
            const active = locale === code;
            return (
              <DropdownMenuItem
                key={code}
                className="cursor-pointer rounded-lg px-2.5 py-2"
                onClick={() => switchTo(code)}
              >
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{t(code)}</span>
                    <span className="text-[11px] font-medium text-charcoal/45 uppercase">
                      {code}
                    </span>
                  </span>
                  {active ? (
                    <Check className="size-4 text-brand" aria-hidden />
                  ) : null}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === "menu") return menu;
  if (variant === "pills") return pills;

  return (
    <>
      <div className="sm:hidden">{menu}</div>
      <div className="hidden sm:contents">{pills}</div>
    </>
  );
}
