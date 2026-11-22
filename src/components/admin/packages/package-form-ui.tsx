import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** White, clearly bordered surface so forms never blend into the cream canvas. */
export const FORM_CARD =
  "min-w-0 rounded-2xl border border-charcoal/15 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_-22px_rgba(15,23,42,0.35)]";

/** Shared input chrome: white fill, visible border, brand focus ring. */
export const FIELD_CLASS =
  "border-charcoal/20 bg-white text-ink shadow-xs placeholder:text-charcoal/40 hover:border-charcoal/30 focus-visible:border-brand focus-visible:ring-brand/20 disabled:bg-charcoal/[0.04]";

type CardProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormCard({ title, hint, action, children, className }: CardProps) {
  return (
    <section className={cn(FORM_CARD, "p-4 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 sm:mb-5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          {hint ? (
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-charcoal/65 sm:text-[13px]">
              {hint}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type AffixProps = {
  prefix?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

const AFFIX_CELL =
  "flex shrink-0 select-none items-center bg-charcoal/[0.05] px-3.5 text-sm font-bold text-charcoal/70";

/** Input group with a visible prefix/suffix cell (e.g. "Rp", "%"). */
export function AffixField({
  prefix,
  suffix,
  invalid,
  disabled,
  className,
  children,
}: AffixProps) {
  return (
    <div
      className={cn(
        "flex h-12 w-full min-w-0 overflow-hidden rounded-xl border border-charcoal/20 bg-white shadow-xs transition",
        "focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20 hover:border-charcoal/30",
        invalid && "border-destructive ring-3 ring-destructive/15",
        disabled && "bg-charcoal/[0.04] opacity-60",
        className,
      )}
    >
      {prefix ? (
        <span className={cn(AFFIX_CELL, "border-r border-charcoal/15")}>{prefix}</span>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {suffix ? (
        <span className={cn(AFFIX_CELL, "border-l border-charcoal/15")}>{suffix}</span>
      ) : null}
    </div>
  );
}

/** Borderless input class used inside AffixField. */
export const AFFIX_INPUT =
  "h-full rounded-none border-0 bg-transparent px-3.5 shadow-none focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent";
