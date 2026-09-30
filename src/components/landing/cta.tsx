"use client";

import { motion, useReducedMotion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import type { LandingCtaContent } from "@/content/cms/landing-types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  content: LandingCtaContent;
};

/** PRD §13.5 CTA — Charcoal/Ink surface with controlled brand accent */
export function LandingCta({ content }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-canvas pb-14 sm:pb-20 lg:pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE }
          }
          className="relative overflow-hidden rounded-xl bg-charcoal px-5 py-10 text-center sm:px-12 sm:py-14"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(230,0,18,0.32),transparent_46%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.06),transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-30 mix-blend-soft-light" />
          <div className="relative">
            <p className="font-jp mb-3 text-xs tracking-[0.2em] text-white/55">
              はじめよう
            </p>
            <h2 className="mx-auto max-w-2xl text-balance text-2xl font-bold tracking-tight text-white sm:text-[2rem]">
              {content.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-white/75 sm:text-lg">
              {content.subtitle}
            </p>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex h-11 w-full max-w-xs rounded-xl bg-brand px-8 text-base font-semibold transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[var(--brand-hover)] sm:w-auto",
              )}
            >
              {content.button}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
