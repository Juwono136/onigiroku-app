"use client";

import { Infinity as InfinityIcon, Minus, Plus, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AFFIX_INPUT,
  AffixField,
  FIELD_CLASS,
} from "@/components/admin/packages/package-form-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DurationMode = "lifetime" | "days";

type Props = {
  mode: DurationMode;
  days: string;
  maxDays: number;
  onModeChange: (mode: DurationMode) => void;
  onDaysChange: (days: string) => void;
};

const PRESETS = [7, 30, 90, 365] as const;

function clampDays(raw: string, max: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(max, Math.max(1, n));
}

export function AccessDurationField({
  mode,
  days,
  maxDays,
  onModeChange,
  onDaysChange,
}: Props) {
  const t = useTranslations("packagesAdmin");
  const daysValue = clampDays(days, maxDays);

  function bump(delta: number) {
    onDaysChange(String(clampDays(String(daysValue + delta), maxDays)));
  }

  return (
    <div className="space-y-3" role="radiogroup" aria-label={t("duration.title")}>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "lifetime"}
        onClick={() => onModeChange("lifetime")}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition",
          mode === "lifetime"
            ? "border-brand/50 bg-brand/[0.06] ring-1 ring-brand/20"
            : "border-charcoal/15 bg-white hover:border-charcoal/30",
        )}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
            mode === "lifetime"
              ? "bg-brand text-white"
              : "bg-charcoal/[0.06] text-charcoal/65",
          )}
        >
          <InfinityIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">
            {t("duration.lifetime")}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-charcoal/65">
            {t("duration.lifetimeHelp")}
          </span>
        </span>
      </button>

      <div
        className={cn(
          "rounded-xl border px-4 py-3.5 transition",
          mode === "days"
            ? "border-brand/50 bg-brand/[0.06] ring-1 ring-brand/20"
            : "border-charcoal/15 bg-white",
        )}
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === "days"}
          onClick={() => onModeChange("days")}
          className="flex w-full cursor-pointer items-start gap-3 text-left"
        >
          <span
            className={cn(
              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              mode === "days"
                ? "bg-brand text-white"
                : "bg-charcoal/[0.06] text-charcoal/65",
            )}
          >
            <Timer className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">
              {t("duration.days")}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-charcoal/65">
              {t("duration.daysHelp")}
            </span>
          </span>
        </button>

        <div
          className={cn(
            "mt-3.5 space-y-3 border-t border-charcoal/10 pt-3.5",
            mode !== "days" && "pointer-events-none opacity-45",
          )}
          aria-disabled={mode !== "days"}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={mode !== "days" || daysValue <= 1}
              aria-label={t("duration.decrease")}
              onClick={() => bump(-1)}
              className="size-11 cursor-pointer rounded-xl border-charcoal/20 bg-white"
            >
              <Minus className="size-4" aria-hidden />
            </Button>
            <AffixField
              suffix={t("duration.daysSuffix")}
              disabled={mode !== "days"}
              className="h-11 min-w-[9.5rem] flex-1 sm:max-w-[14rem]"
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxDays}
                aria-label={t("duration.daysLabel")}
                disabled={mode !== "days"}
                value={days}
                onChange={(e) => onDaysChange(e.target.value)}
                onBlur={() =>
                  onDaysChange(String(clampDays(days, maxDays)))
                }
                className={cn(
                  AFFIX_INPUT,
                  "text-center text-base font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                )}
              />
            </AffixField>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={mode !== "days" || daysValue >= maxDays}
              aria-label={t("duration.increase")}
              onClick={() => bump(1)}
              className="size-11 cursor-pointer rounded-xl border-charcoal/20 bg-white"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const active = mode === "days" && daysValue === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={mode !== "days"}
                  onClick={() => onDaysChange(String(preset))}
                  className={cn(
                    FIELD_CLASS,
                    "h-9 cursor-pointer rounded-lg px-3 text-xs font-bold tabular-nums",
                    active
                      ? "border-brand bg-brand text-white hover:border-brand"
                      : "bg-white",
                  )}
                >
                  {t("duration.preset", { days: preset })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
