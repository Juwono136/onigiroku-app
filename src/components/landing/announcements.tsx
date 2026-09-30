"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type {
  LandingAnnouncementIcon,
  LandingAnnouncementsContent,
} from "@/content/cms/landing-types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const ICONS: Record<LandingAnnouncementIcon, LucideIcon> = {
  sparkles: Sparkles,
  clock: Clock3,
  chart: ChartColumn,
  graduation: GraduationCap,
  bell: Bell,
};

type Props = {
  content: LandingAnnouncementsContent;
};

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function isHashHref(href: string) {
  return href.startsWith("#");
}

function hasImage(src: string | null | undefined) {
  return Boolean(src && src.trim().length > 0);
}

/**
 * Lightweight announcement carousel (max 5).
 * Default: Lucide icon panels (no static PNGs). Optional CMS `imageSrc` when media exists.
 */
export function LandingAnnouncements({ content }: Props) {
  const slides = content.slides;
  const reduceMotion = useReducedMotion();
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const swipeLock = useRef(false);

  const count = slides.length;
  const safeIndex = count === 0 ? 0 : ((index % count) + count) % count;
  const active = slides[safeIndex];

  const goTo = useCallback(
    (next: number) => {
      if (count === 0 || swipeLock.current) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);
  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);

  // Stable interval — avoid resetting every slide (feels sticky).
  useEffect(() => {
    if (count <= 1 || paused || reduceMotion || content.autoPlayMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, content.autoPlayMs);
    return () => window.clearInterval(timer);
  }, [count, paused, reduceMotion, content.autoPlayMs]);

  if (!content.enabled || !active) {
    return null;
  }

  const href = active.href ?? null;
  const Icon = ICONS[active.icon] ?? Sparkles;
  const showImage = hasImage(active.imageSrc);
  const focusRing =
    "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

  const slideBody = (
    <div className="relative grid overflow-hidden bg-canvas sm:grid-cols-[minmax(0,11rem)_1fr] lg:grid-cols-[minmax(0,13rem)_1fr]">
      {/* Static visual column — pattern stays put; only icon/image swaps */}
      <div className="relative flex min-h-[9.5rem] items-center justify-center overflow-hidden bg-soft sm:min-h-[12.5rem]">
        <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-40" aria-hidden />
        {showImage ? (
          <Image
            src={active.imageSrc!}
            alt={active.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, 208px"
            className="object-cover"
            priority={false}
          />
        ) : (
          <motion.div
            key={active.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: "easeOut" }
            }
            className="relative z-[1] inline-flex size-16 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_14px_32px_-16px_rgba(230,0,18,0.55)] sm:size-[4.5rem]"
          >
            <Icon className="size-8 sm:size-9" strokeWidth={1.75} aria-hidden />
          </motion.div>
        )}
      </div>

      <div className="flex flex-col justify-center border-t border-charcoal/10 p-5 sm:border-t-0 sm:border-l sm:p-7 lg:p-8">
        <p className="font-jp text-[0.65rem] font-semibold tracking-[0.18em] text-brand sm:text-xs">
          {content.slideKicker}
        </p>
        <motion.div
          key={active.id}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: "easeOut" }
          }
        >
          <h3 className="mt-2 text-balance text-lg font-bold leading-snug text-ink sm:text-xl lg:text-2xl">
            {active.title}
          </h3>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-charcoal/80 sm:text-base">
            {active.caption}
          </p>
        </motion.div>
      </div>
    </div>
  );

  let slideCard = slideBody;
  if (href) {
    if (isExternalHref(href)) {
      slideCard = (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={focusRing}
        >
          {slideBody}
        </a>
      );
    } else if (isHashHref(href)) {
      slideCard = (
        <a href={href} className={focusRing}>
          {slideBody}
        </a>
      );
    } else {
      slideCard = (
        <Link href={href as "/register"} className={focusRing}>
          {slideBody}
        </Link>
      );
    }
  }

  return (
    <section
      id="announcements"
      className="scroll-mt-16 border-y border-charcoal/10 bg-washi py-12 sm:py-16 lg:py-20"
      aria-labelledby={labelId}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            {content.eyebrow}
          </p>
          <h2
            id={labelId}
            className="text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {content.title}
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-charcoal/85">
            {content.subtitle}
          </p>
        </div>

        <div className="relative mx-auto mt-8 w-full max-w-4xl sm:mt-10">
          <div
            className="jp-rail overflow-hidden rounded-xl border border-charcoal/10 bg-white shadow-[0_16px_40px_-30px_rgba(67,64,64,0.4)]"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current == null) return;
              const delta =
                (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(delta) < 40) return;
              swipeLock.current = true;
              if (delta > 0) goPrev();
              else goNext();
              window.setTimeout(() => {
                swipeLock.current = false;
              }, 180);
            }}
          >
            {slideCard}
          </div>

          {count > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-6">
              <p className="text-sm font-medium tracking-wide text-charcoal/60 tabular-nums">
                <span className="text-brand">{safeIndex + 1}</span>
                <span className="mx-1.5 text-charcoal/35">/</span>
                {count}
              </p>

              <div
                className="order-3 flex w-full items-center justify-center gap-2 sm:order-2 sm:w-auto"
                role="tablist"
                aria-label={content.title}
              >
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={i === safeIndex}
                    aria-label={`${i + 1}: ${slide.title}`}
                    onClick={() => goTo(i)}
                    className={cn(
                      "h-2.5 rounded-full transition-[width,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      i === safeIndex
                        ? "w-8 bg-brand"
                        : "w-2.5 bg-charcoal/25 hover:bg-charcoal/45",
                    )}
                  />
                ))}
              </div>

              <div className="order-2 flex items-center gap-2 sm:order-3">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label={content.prevLabel}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-charcoal/15 bg-white text-charcoal shadow-sm transition hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:size-11"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label={content.nextLabel}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-charcoal/15 bg-white text-charcoal shadow-sm transition hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:size-11"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
