"use client";

import { motion } from "framer-motion";

import { HeroScrollHint } from "@/components/landing/hero-scroll-hint";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { buttonVariants } from "@/components/ui/button";
import type { LandingHeroContent } from "@/content/cms/landing-types";
import { useEntranceMotion, useMotionSafe } from "@/hooks/use-motion-safe";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const KANA_CHIPS = ["あ", "か", "漢", "語", "JLPT"] as const;
const RING = 2 * Math.PI * 118;
const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  content: LandingHeroContent;
};

/**
 * Full first-viewport hero (minus sticky header).
 * Content is vertically centered; scroll cue sits at the bottom edge.
 */
export function LandingHero({ content }: Props) {
  const motionOn = useMotionSafe();
  const copy = useEntranceMotion(0);
  const visual = useEntranceMotion(0.12);

  return (
    <section
      id="hero"
      className="relative flex flex-col overflow-hidden bg-hero-mesh max-md:min-h-0 md:min-h-[calc(100svh-4rem)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-50" />

      <div
        className="pointer-events-none absolute top-20 right-3 hidden select-none text-[0.7rem] font-medium tracking-[0.35em] text-charcoal/35 [writing-mode:vertical-rl] sm:right-6 md:top-24 md:block lg:right-[max(1.5rem,calc((100vw-72rem)/2))]"
        aria-hidden
      >
        <span className="font-jp">学びを、見える化する。</span>
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:gap-14 lg:px-8 lg:py-16">
        <motion.div
          initial={copy.initial}
          animate={copy.animate}
          transition={copy.transition}
          className="flex w-full max-w-xl flex-1 flex-col items-start lg:max-w-[34rem]"
        >
          <BrandWordmark
            href={null}
            size={52}
            priority
            className="mb-6 gap-3"
            logoClassName="h-11 w-11 sm:h-12 sm:w-12"
            textClassName="text-2xl sm:text-3xl"
          />

          <p className="mb-3 text-sm font-semibold tracking-wide text-brand">
            {content.eyebrow}
          </p>

          <h1 className="text-balance text-[1.75rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
            {content.title}
          </h1>

          <p className="mt-4 max-w-lg text-pretty text-[0.95rem] leading-relaxed text-charcoal/90 sm:mt-5 sm:text-lg">
            {content.subtitle}
          </p>

          <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full rounded-xl px-6 text-base font-semibold shadow-[0_12px_28px_-12px_rgba(230,0,18,0.65)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto",
              )}
            >
              {content.ctaPrimary}
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-11 w-full rounded-xl border-charcoal/20 bg-white/90 px-6 text-base font-semibold text-charcoal backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto",
              )}
            >
              {content.ctaSecondary}
            </a>
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-charcoal/70">
            {content.trust}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 22 }}
          animate={
            visual.show
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.94, y: 22 }
          }
          transition={
            visual.reduceMotion
              ? { duration: 0 }
              : { duration: 0.8, delay: 0.1, ease: EASE }
          }
          className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center lg:max-w-none lg:justify-end"
          aria-hidden
        >
          <div className="relative mx-auto aspect-square w-full max-w-[17rem] sm:max-w-[22.5rem]">
            <motion.div
              className="absolute inset-[8%] rounded-full bg-gradient-to-br from-brand/18 via-brand/5 to-transparent blur-2xl"
              animate={
                motionOn
                  ? { scale: [1, 1.05, 1], opacity: [0.65, 1, 0.65] }
                  : undefined
              }
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />

            <svg
              viewBox="0 0 320 320"
              className="relative h-full w-full drop-shadow-[0_24px_50px_-28px_rgba(67,64,64,0.45)]"
            >
              <defs>
                <linearGradient
                  id="onigiRing"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#E60012" />
                  <stop offset="100%" stopColor="#C90010" />
                </linearGradient>
              </defs>
              <circle
                cx="160"
                cy="160"
                r="118"
                fill="none"
                stroke="rgba(67,64,64,0.12)"
                strokeWidth="12"
              />
              <motion.circle
                cx="160"
                cy="160"
                r="118"
                fill="none"
                stroke="url(#onigiRing)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${RING}`}
                initial={{ strokeDashoffset: RING }}
                animate={{
                  strokeDashoffset: visual.show ? RING * (1 - 0.78) : RING,
                }}
                transition={
                  visual.reduceMotion
                    ? { duration: 0 }
                    : { duration: 1.4, delay: 0.35, ease: "easeOut" }
                }
                transform="rotate(-90 160 160)"
              />
              <circle cx="160" cy="160" r="98" fill="#FAF8F6" />
              <circle
                cx="160"
                cy="160"
                r="98"
                fill="none"
                stroke="rgba(67,64,64,0.08)"
                strokeWidth="1"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <BrandWordmark
                href={null}
                size={40}
                className="pointer-events-none mb-2 gap-2"
                logoClassName="h-10 w-10"
                textClassName="text-lg"
              />
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-charcoal/55 uppercase">
                {content.orbLabel}
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-brand">
                78%
              </p>
              <p className="font-jp mt-1 text-sm text-charcoal/70">
                {content.orbHint}
              </p>
            </div>

            {KANA_CHIPS.map((chip, index) => {
              const angle = -40 + index * 28;
              const rad = (angle * Math.PI) / 180;
              const radius = 46;
              const x = 50 + Math.cos(rad) * radius;
              const y = 50 + Math.sin(rad) * radius;
              return (
                <motion.span
                  key={chip}
                  className="font-jp absolute rounded-full border border-charcoal/10 bg-white/95 px-2.5 py-1 text-xs font-semibold text-charcoal shadow-sm backdrop-blur-sm"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    translate: "-50% -50%",
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={
                    visual.show
                      ? {
                          opacity: 1,
                          scale: 1,
                          y: motionOn ? [0, index % 2 === 0 ? -4 : 3, 0] : 0,
                        }
                      : { opacity: 0, scale: 0.8 }
                  }
                  transition={
                    visual.reduceMotion
                      ? { duration: 0 }
                      : {
                          opacity: {
                            delay: 0.45 + index * 0.06,
                            duration: 0.45,
                            ease: EASE,
                          },
                          scale: {
                            delay: 0.45 + index * 0.06,
                            duration: 0.45,
                            ease: EASE,
                          },
                          y: {
                            duration: 3.6 + index * 0.25,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.9,
                          },
                        }
                  }
                >
                  {chip}
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Reserve space so scroll cue never overlaps content */}
      <div className="relative h-16 shrink-0 safe-pb sm:h-24">
        <HeroScrollHint label={content.scrollExplore} targetId="announcements" />
      </div>
    </section>
  );
}
