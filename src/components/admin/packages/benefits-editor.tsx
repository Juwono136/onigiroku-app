"use client";

import { ArrowDown, ArrowUp, ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  AFFIX_INPUT,
  AffixField,
} from "@/components/admin/packages/package-form-ui";
import { BenefitList } from "@/components/classes/benefit-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BENEFIT_TEXT_MAX,
  BENEFITS_MAX,
  benefitText,
} from "@/lib/packages/benefits";
import type { PackageBenefit } from "@/lib/packages/types";
import { cn } from "@/lib/utils";

export type BenefitDraft = PackageBenefit & { uid: string };

let uidCounter = 0;
export function newBenefitUid() {
  uidCounter += 1;
  return `benefit-${uidCounter}`;
}

export function toBenefitDrafts(
  benefits: PackageBenefit[] | null | undefined,
): BenefitDraft[] {
  return (benefits ?? []).map((b) => ({
    uid: newBenefitUid(),
    textId: b.textId ?? "",
    textEn: b.textEn ?? "",
  }));
}

type Props = {
  value: BenefitDraft[];
  onChange: (next: BenefitDraft[]) => void;
  /** Active editor language tab — scopes inputs and live preview. */
  activeLocale: "id" | "en";
};

const PREVIEW_COLLAPSE_AT = 6;

type FocusTarget = { uid: string };

export function BenefitsEditor({ value, onChange, activeLocale }: Props) {
  const t = useTranslations("packagesAdmin");
  const focusRef = useRef<FocusTarget | null>(null);
  const atLimit = value.length >= BENEFITS_MAX;
  const field = activeLocale === "id" ? "textId" : "textEn";
  const [removeUid, setRemoveUid] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    const target = focusRef.current;
    if (!target) return;
    focusRef.current = null;
    document.getElementById(`${target.uid}-${field}`)?.focus();
  }, [value, field]);

  useEffect(() => {
    setPreviewExpanded(false);
  }, [activeLocale]);

  function update(uid: string, patch: Partial<PackageBenefit>) {
    onChange(value.map((b) => (b.uid === uid ? { ...b, ...patch } : b)));
  }

  function insertAfter(index: number) {
    if (value.length >= BENEFITS_MAX) return;
    const draft: BenefitDraft = { uid: newBenefitUid(), textId: "", textEn: "" };
    const next = [...value];
    next.splice(index + 1, 0, draft);
    focusRef.current = { uid: draft.uid };
    onChange(next);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function confirmRemove() {
    if (!removeUid) return;
    onChange(value.filter((b) => b.uid !== removeUid));
    setRemoveUid(null);
  }

  const previewLines = useMemo(
    () =>
      value
        .map((b) => benefitText(b, activeLocale))
        .filter(Boolean),
    [value, activeLocale],
  );

  const previewCollapsed =
    !previewExpanded && previewLines.length > PREVIEW_COLLAPSE_AT;
  const previewVisible = previewCollapsed
    ? previewLines.slice(0, PREVIEW_COLLAPSE_AT)
    : previewLines;

  const removeTarget = value.find((b) => b.uid === removeUid);
  const removeLabel = removeTarget
    ? benefitText(removeTarget, activeLocale) ||
      benefitText(removeTarget, activeLocale === "id" ? "en" : "id") ||
      t("benefits.itemLabel", {
        number: value.findIndex((b) => b.uid === removeUid) + 1,
      })
    : "";

  const langPrefix = activeLocale === "id" ? "ID" : "EN";
  const placeholder =
    activeLocale === "id"
      ? t("benefits.placeholderId")
      : t("benefits.placeholderEn");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums",
              atLimit
                ? "border-brand/30 bg-brand/10 text-brand"
                : "border-charcoal/15 bg-[var(--workspace-surface)] text-charcoal/70",
            )}
          >
            {t("benefits.count", { count: value.length, max: BENEFITS_MAX })}
          </span>
          <span className="rounded-full border border-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-charcoal/65 uppercase">
            {activeLocale === "id"
              ? t("benefits.editingId")
              : t("benefits.editingEn")}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={atLimit}
          onClick={() => insertAfter(value.length - 1)}
          className="h-10 cursor-pointer gap-2 rounded-xl border-charcoal/20 bg-white px-3.5 font-semibold shadow-xs"
        >
          <Plus className="size-4" aria-hidden />
          {t("benefits.add")}
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-charcoal/25 bg-[var(--workspace-surface)]/50 px-4 py-8 text-center">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <ListChecks className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-ink">{t("benefits.empty")}</p>
          <p className="max-w-sm text-xs leading-relaxed text-charcoal/60">
            {t("benefits.emptyHint")}
          </p>
        </div>
      ) : (
        <ol className="max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto overscroll-contain pr-1">
          {value.map((benefit, index) => {
            const text = benefit[field];
            return (
              <li
                key={benefit.uid}
                className="rounded-xl border border-charcoal/15 bg-[var(--workspace-surface)]/40 p-3 sm:p-3.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white tabular-nums">
                      {index + 1}
                    </span>
                    <span className="truncate text-xs font-bold tracking-wide text-charcoal/65 uppercase">
                      {t("benefits.itemLabel", { number: index + 1 })}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={index === 0}
                      aria-label={t("benefits.moveUp")}
                      title={t("benefits.moveUp")}
                      onClick={() => move(index, -1)}
                      className="size-9 cursor-pointer rounded-lg border-charcoal/20 bg-white"
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={index === value.length - 1}
                      aria-label={t("benefits.moveDown")}
                      title={t("benefits.moveDown")}
                      onClick={() => move(index, 1)}
                      className="size-9 cursor-pointer rounded-lg border-charcoal/20 bg-white"
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t("benefits.remove")}
                      title={t("benefits.remove")}
                      onClick={() => setRemoveUid(benefit.uid)}
                      className="size-9 cursor-pointer rounded-lg border-charcoal/20 bg-white text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <AffixField
                  prefix={langPrefix}
                  suffix={
                    text.length >= BENEFIT_TEXT_MAX - 40 ? (
                      <span
                        className={cn(
                          "text-[11px] tabular-nums",
                          text.length >= BENEFIT_TEXT_MAX && "text-destructive",
                        )}
                      >
                        {text.length}/{BENEFIT_TEXT_MAX}
                      </span>
                    ) : undefined
                  }
                  className="h-11"
                >
                  <Input
                    id={`${benefit.uid}-${field}`}
                    value={text}
                    maxLength={BENEFIT_TEXT_MAX}
                    aria-label={`${t("benefits.itemLabel", { number: index + 1 })} · ${langPrefix}`}
                    placeholder={placeholder}
                    onChange={(e) =>
                      update(benefit.uid, { [field]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        insertAfter(index);
                      }
                    }}
                    className={cn(AFFIX_INPUT, "text-sm")}
                  />
                </AffixField>
                {!benefit[activeLocale === "id" ? "textEn" : "textId"]?.trim() ? (
                  <p className="mt-1.5 text-[11px] text-charcoal/55">
                    {t("benefits.otherLangMissing")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {atLimit ? (
        <p className="text-xs font-semibold text-brand">
          {t("benefits.limitReached", { max: BENEFITS_MAX })}
        </p>
      ) : null}

      <div className="rounded-xl border border-charcoal/15 bg-white p-4 shadow-xs ring-1 ring-brand/5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
            {t("benefits.previewTitle")}
          </h3>
          <p className="text-[11px] text-charcoal/55">
            {t("benefits.previewHint", {
              language:
                activeLocale === "id"
                  ? t("benefits.previewLangId")
                  : t("benefits.previewLangEn"),
            })}
          </p>
        </div>
        {previewLines.length > 0 ? (
          <div className="space-y-3">
            <div
              className={cn(
                previewCollapsed && "max-h-56 overflow-hidden",
              )}
            >
              <BenefitList items={previewVisible} variant="panel" />
            </div>
            {previewLines.length > PREVIEW_COLLAPSE_AT ? (
              <button
                type="button"
                onClick={() => setPreviewExpanded((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition",
                    previewExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
                {previewExpanded
                  ? t("benefits.previewShowLess")
                  : t("benefits.previewShowMore", {
                      count: previewLines.length - PREVIEW_COLLAPSE_AT,
                    })}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-charcoal/50">{t("benefits.previewEmpty")}</p>
        )}
      </div>

      <AdminConfirmDialog
        open={removeUid !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveUid(null);
        }}
        title={t("confirm.removeBenefitTitle")}
        description={t("confirm.removeBenefitBody", { label: removeLabel })}
        confirmLabel={t("benefits.remove")}
        cancelLabel={t("actions.cancel")}
        tone="danger"
        onConfirm={confirmRemove}
      />
    </div>
  );
}
