"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type Props = {
  label: string;
  targetId?: string;
};

/** Clear scroll cue pinned to the bottom of the hero viewport. */
export function HeroScrollHint({ label, targetId = "announcements" }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center sm:bottom-7">
      <motion.a
        href={`#${targetId}`}
        aria-label={label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { delay: 0.85, duration: 0.55, ease: [0.22, 1, 0.36, 1] }
        }
        className="pointer-events-auto group inline-flex flex-col items-center gap-2 rounded-2xl px-3 py-2 text-charcoal/70 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <span className="text-[0.7rem] font-semibold tracking-[0.18em] uppercase">
          {label}
        </span>
        <motion.span
          aria-hidden
          animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
          transition={{
            duration: 1.9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex size-10 items-center justify-center rounded-full border border-charcoal/15 bg-white shadow-[0_10px_28px_-14px_rgba(67,64,64,0.55)] transition-colors group-hover:border-brand/35 group-hover:bg-brand group-hover:text-white"
        >
          <ChevronDown className="size-5" strokeWidth={2.5} />
        </motion.span>
      </motion.a>
    </div>
  );
}
