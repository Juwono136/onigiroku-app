"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Simple branded 404 — calm, readable, one clear next step.
 */
export function NotFoundView() {
  const t = useTranslations("notFound");
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-canvas px-4 py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-seigaiha opacity-40"
        aria-hidden
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }
        }
        className="relative mx-auto w-full max-w-md text-center"
      >
        <p className="font-jp text-5xl font-bold tracking-tight text-brand/90 sm:text-6xl">
          {t("code")}
        </p>
        <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-charcoal/75 sm:text-base">
          {t("description")}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 w-full cursor-pointer rounded-xl px-6 font-semibold sm:w-auto",
            )}
          >
            {t("home")}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold text-charcoal/80 transition-colors hover:text-brand sm:w-auto"
          >
            {t("login")}
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
