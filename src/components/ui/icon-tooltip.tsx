"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  label: string;
  children: ReactNode;
};

export function IconTooltip({ label, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function show(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  }

  return (
    <span
      className="inline-flex"
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              style={{ left: pos.x, top: pos.y }}
              className="pointer-events-none fixed z-[90] -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-lg"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
