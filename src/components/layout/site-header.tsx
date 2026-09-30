"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NAV_KEYS = ["features", "howItWorks", "pricing", "faq"] as const;

const NAV_HREFS = {
  features: "#features",
  howItWorks: "#how-it-works",
  pricing: "#pricing",
  faq: "#faq",
} as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", closeOnDesktop);
    return () => mq.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
        <BrandWordmark
          size={36}
          priority
          className="min-w-0 gap-2 sm:gap-2.5"
          logoClassName="h-8 w-8 shrink-0 sm:h-9 sm:w-9 transition-transform duration-300 group-hover:scale-105"
          textClassName="truncate text-base sm:text-lg"
        />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_KEYS.map((key) => (
            <a
              key={key}
              href={NAV_HREFS[key]}
              className="text-sm font-medium text-charcoal/80 transition-colors hover:text-brand"
            >
              {t(key)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost" }), "font-semibold")}
          >
            {t("login")}
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "default" }),
              "rounded-xl font-semibold shadow-sm",
            )}
          >
            {t("register")}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher />
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "rounded-xl",
            )}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={t("closeMenu")}
              className="fixed inset-0 top-16 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0  }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute inset-x-0 top-full z-50 origin-top border-b border-border/80 bg-white shadow-[0_24px_48px_-28px_rgba(24,24,27,0.45)] md:hidden"
              initial={
                { opacity: 0, y: -12, scaleY: 0.96 }
              }
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={
                { opacity: 0, y: -10, scaleY: 0.97 }
              }
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
                {NAV_KEYS.map((key, index) => (
                  <motion.a
                    key={key}
                    href={NAV_HREFS[key]}
                    className="rounded-xl px-3 py-3 text-base font-medium text-ink transition-colors hover:bg-soft hover:text-brand"
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, y: -6  }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + index * 0.035 }}
                  >
                    {t(key)}
                  </motion.a>
                ))}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-4">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-11 rounded-xl font-semibold",
                    )}
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants(),
                      "h-11 rounded-xl font-semibold",
                    )}
                  >
                    {t("register")}
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
