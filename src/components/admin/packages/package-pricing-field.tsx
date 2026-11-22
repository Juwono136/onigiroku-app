"use client";

import { CalendarClock, Percent } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  AFFIX_INPUT,
  AffixField,
  FIELD_CLASS,
} from "@/components/admin/packages/package-form-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatDiscountPercent,
  formatIdr,
  parseDiscountPercent,
  parseIdrInput,
} from "@/lib/packages/format";
import { cn } from "@/lib/utils";

type Props = {
  priceIdr: number;
  discountPercent: string;
  discountStartsAt: string;
  discountEndsAt: string;
  maxPrice: number;
  onPriceChange: (priceIdr: number) => void;
  onDiscountChange: (discountPercent: string) => void;
  onScheduleChange: (patch: {
    discountStartsAt?: string;
    discountEndsAt?: string;
  }) => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function PackagePricingField({
  priceIdr,
  discountPercent,
  discountStartsAt,
  discountEndsAt,
  maxPrice,
  onPriceChange,
  onDiscountChange,
  onScheduleChange,
}: Props) {
  const t = useTranslations("packagesAdmin");
  const locale = useLocale();
  const pct = parseDiscountPercent(discountPercent);
  const discountOn = pct > 0;
  const previewEffective =
    discountOn && priceIdr > 0
      ? Math.round((priceIdr * (100 - pct)) / 100)
      : priceIdr;
  const rangeInvalid =
    discountOn &&
    Boolean(discountStartsAt) &&
    Boolean(discountEndsAt) &&
    discountStartsAt > discountEndsAt;

  const datetimeClass = cn(
    FIELD_CLASS,
    "h-11 rounded-xl px-3 text-sm [color-scheme:light]",
  );

  function applyPreset(days: number) {
    const start = new Date();
    start.setSeconds(0, 0);
    const end = addDays(start, days);
    onScheduleChange({
      discountStartsAt: toLocalInput(start),
      discountEndsAt: toLocalInput(end),
    });
  }

  function startNow() {
    const start = new Date();
    start.setSeconds(0, 0);
    onScheduleChange({
      discountStartsAt: toLocalInput(start),
      discountEndsAt: discountEndsAt || toLocalInput(addDays(start, 7)),
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="pkg-price">{t("pricing.price")}</Label>
        <AffixField prefix={t("pricing.rpPrefix")}>
          <Input
            id="pkg-price"
            inputMode="numeric"
            autoComplete="off"
            value={
              priceIdr > 0
                ? new Intl.NumberFormat("id-ID").format(priceIdr)
                : ""
            }
            placeholder="0"
            onChange={(e) =>
              onPriceChange(Math.min(maxPrice, parseIdrInput(e.target.value)))
            }
            className={cn(
              AFFIX_INPUT,
              "text-right text-lg font-bold tabular-nums",
            )}
          />
        </AffixField>
        <p className="text-[11px] leading-relaxed text-charcoal/60">
          {t("pricing.priceHint")}
        </p>
      </div>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pkg-discount">{t("pricing.discountPercent")}</Label>
          <AffixField
            prefix={<Percent className="size-3.5" aria-hidden />}
            suffix="%"
          >
            <Input
              id="pkg-discount"
              inputMode="decimal"
              autoComplete="off"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={discountPercent}
              onChange={(e) => onDiscountChange(e.target.value)}
              onBlur={() =>
                onDiscountChange(String(parseDiscountPercent(discountPercent)))
              }
              className={cn(
                AFFIX_INPUT,
                "text-right text-lg font-bold tabular-nums",
              )}
            />
          </AffixField>
          <p className="text-[11px] leading-relaxed text-charcoal/60">
            {t("pricing.discountFractionHint")}
          </p>
        </div>

        <div
          className={cn(
            "rounded-xl border px-4 py-3.5",
            discountOn
              ? "border-brand/30 bg-brand/[0.06]"
              : "border-charcoal/15 bg-[var(--workspace-surface)]/60",
          )}
        >
          <p className="text-[10px] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
            {t("pricing.effective")}
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-2xl font-bold tabular-nums text-brand">
              {previewEffective > 0
                ? formatIdr(previewEffective, locale)
                : t("pricing.free")}
            </p>
            {discountOn && priceIdr > 0 ? (
              <>
                <p className="pb-1 text-sm tabular-nums text-charcoal/50 line-through">
                  {formatIdr(priceIdr, locale)}
                </p>
                <span className="mb-1 inline-flex rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  −{formatDiscountPercent(pct, locale)}%
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-charcoal/60">
            {t("pricing.effectiveHint")}
          </p>
        </div>
      </div>

      <fieldset
        className={cn(
          "space-y-3 rounded-xl border p-3.5 transition",
          discountOn
            ? "border-brand/25 bg-white"
            : "border-charcoal/15 bg-[var(--workspace-surface)]/40 opacity-80",
        )}
        disabled={!discountOn}
        aria-disabled={!discountOn}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <legend className="float-left flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarClock className="size-4 text-brand" aria-hidden />
            {t("pricing.discountScheduleTitle")}
          </legend>
          {discountOn && (discountStartsAt || discountEndsAt) ? (
            <button
              type="button"
              className="cursor-pointer text-xs font-semibold text-charcoal/65 underline-offset-2 hover:text-brand hover:underline"
              onClick={() =>
                onScheduleChange({ discountStartsAt: "", discountEndsAt: "" })
              }
            >
              {t("pricing.clearDates")}
            </button>
          ) : null}
        </div>

        <p className="clear-both text-xs leading-relaxed text-charcoal/65">
          {discountOn
            ? t("pricing.discountScheduleRequired")
            : t("pricing.discountOffHint")}
        </p>

        {discountOn ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer rounded-lg border-charcoal/20 bg-white px-2.5 text-xs font-semibold"
              onClick={startNow}
            >
              {t("pricing.scheduleStartNow")}
            </Button>
            {([7, 14, 30] as const).map((days) => (
              <Button
                key={days}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer rounded-lg border-charcoal/20 bg-white px-2.5 text-xs font-semibold"
                onClick={() => applyPreset(days)}
              >
                {t("pricing.scheduleDays", { days })}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pkg-discount-start">
              {t("pricing.discountStarts")}
              {discountOn ? (
                <span className="ml-1 text-destructive" aria-hidden>
                  *
                </span>
              ) : null}
            </Label>
            <Input
              id="pkg-discount-start"
              type="datetime-local"
              value={discountStartsAt}
              max={discountEndsAt || undefined}
              onChange={(e) =>
                onScheduleChange({ discountStartsAt: e.target.value })
              }
              className={datetimeClass}
            />
            <p className="text-[11px] text-charcoal/60">
              {t("pricing.discountStartsHelp")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-discount-end">
              {t("pricing.discountEnds")}
              {discountOn ? (
                <span className="ml-1 text-destructive" aria-hidden>
                  *
                </span>
              ) : null}
            </Label>
            <Input
              id="pkg-discount-end"
              type="datetime-local"
              value={discountEndsAt}
              min={discountStartsAt || undefined}
              aria-invalid={rangeInvalid}
              onChange={(e) =>
                onScheduleChange({ discountEndsAt: e.target.value })
              }
              className={datetimeClass}
            />
            <p className="text-[11px] text-charcoal/60">
              {t("pricing.discountEndsHelp")}
            </p>
          </div>
        </div>

        {rangeInvalid ? (
          <p role="alert" className="text-xs font-semibold text-destructive">
            {t("pricing.discountRangeInvalid")}
          </p>
        ) : discountOn ? (
          <p className="text-[11px] leading-relaxed text-charcoal/60">
            {t("pricing.discountHint")}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
