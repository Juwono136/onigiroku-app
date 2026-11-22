"use client";

import { Archive, Eye, FilePenLine } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PackageStatus } from "@/lib/packages/types";
import { cn } from "@/lib/utils";

type Props = {
  value: PackageStatus;
  onChange: (next: PackageStatus) => void;
  disabled?: boolean;
};

const OPTIONS: Array<{
  value: PackageStatus;
  icon: typeof Eye;
}> = [
  { value: "PUBLISHED", icon: Eye },
  { value: "DRAFT", icon: FilePenLine },
  { value: "ARCHIVED", icon: Archive },
];

/**
 * Distinct lifecycle picker: Published (live catalog), Draft (WIP, never public),
 * Archived (retired from catalog; purchases preserved).
 */
export function PackageStatusField({ value, onChange, disabled }: Props) {
  const t = useTranslations("packagesAdmin");

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="sr-only">{t("fields.status")}</legend>
      <div
        role="radiogroup"
        aria-label={t("fields.status")}
        className="grid gap-2.5 sm:grid-cols-3"
      >
        {OPTIONS.map(({ value: option, icon: Icon }) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-2 rounded-xl border px-3.5 py-3 text-left transition",
                active
                  ? option === "ARCHIVED"
                    ? "border-charcoal/40 bg-charcoal/[0.06] ring-1 ring-charcoal/25"
                    : option === "DRAFT"
                      ? "border-ink/35 bg-ink/[0.04] ring-1 ring-ink/20"
                      : "border-brand/50 bg-brand/[0.06] ring-1 ring-brand/25"
                  : "border-charcoal/15 bg-white hover:border-charcoal/30",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-lg",
                    active
                      ? option === "PUBLISHED"
                        ? "bg-brand text-white"
                        : option === "ARCHIVED"
                          ? "bg-charcoal text-white"
                          : "bg-ink text-white"
                      : "bg-charcoal/[0.06] text-charcoal/65",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-bold text-ink">
                  {t(`status.${option}`)}
                </span>
              </span>
              <span className="text-[11px] leading-relaxed text-charcoal/65">
                {t(`statusHelp.${option}`)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-charcoal/60">
        {t(`statusHelp.active.${value}`)}
      </p>
    </fieldset>
  );
}
