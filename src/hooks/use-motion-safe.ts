"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Entrance motion that always runs after mount (so refresh shows animation).
 * Honors prefers-reduced-motion by skipping duration.
 */
export function useEntranceMotion(delay = 0) {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return {
    show,
    reduceMotion: Boolean(reduceMotion),
    initial: { opacity: 0, y: 28 },
    animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.7, delay, ease: EASE_OUT },
  };
}

export function useMotionSafe() {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return ready && !reduceMotion;
}
