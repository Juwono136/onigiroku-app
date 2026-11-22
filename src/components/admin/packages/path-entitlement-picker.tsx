"use client";

import { Check, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { FIELD_CLASS } from "@/components/admin/packages/package-form-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PathOption = {
  id: string;
  label: string;
  archived?: boolean;
};

type Props = {
  options: PathOption[];
  selectedIds: string[];
  allPaths: boolean;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
};

const CHIP_LIMIT = 6;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Scalable multi-select for learning paths: compact summary + searchable dialog
 * so long catalogs stay usable on every viewport.
 */
export function PathEntitlementPicker({
  options,
  selectedIds,
  allPaths,
  loading,
  error,
  disabled,
  onToggle,
  onClear,
}: Props) {
  const t = useTranslations("packagesAdmin");
  const [open, setOpen] = useState(false);
  const [filterInput, setFilterInput] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilter(filterInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [filterInput]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet],
  );

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [filter, options]);

  const locked = disabled || allPaths;
  const visibleChips = selectedOptions.slice(0, CHIP_LIMIT);
  const hiddenChipCount = Math.max(0, selectedOptions.length - CHIP_LIMIT);

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-charcoal/15 bg-[var(--workspace-surface)]/40 p-3 sm:p-3.5",
        locked && "opacity-55",
      )}
      aria-disabled={locked}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.14em] text-charcoal/65 uppercase">
            {t("entitlements.pathsLabel")}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-charcoal/55">
            {t("entitlements.pathsPickerHint")}
          </p>
        </div>
        <span className="rounded-full border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand tabular-nums">
          {t("entitlements.selectedCount", { count: selectedIds.length })}
        </span>
      </div>

      {selectedOptions.length > 0 && !allPaths ? (
        <ul className="flex flex-wrap gap-1.5">
          {visibleChips.map((path) => (
            <li key={path.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onToggle(path.id)}
                className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-2 py-1 text-left text-xs font-semibold text-ink shadow-xs transition hover:border-destructive/40 hover:text-destructive"
                title={t("entitlements.removePath", { name: path.label })}
              >
                <span className="font-jp min-w-0 truncate">{path.label}</span>
                <X className="size-3.5 shrink-0 opacity-70" aria-hidden />
              </button>
            </li>
          ))}
          {hiddenChipCount > 0 ? (
            <li className="inline-flex items-center rounded-lg border border-dashed border-charcoal/20 bg-white/70 px-2 py-1 text-[11px] font-bold text-charcoal/60">
              {t("entitlements.moreSelected", { count: hiddenChipCount })}
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm text-charcoal/55">
          {allPaths
            ? t("entitlements.pathsDisabledByAll")
            : t("entitlements.pathsNoneSelected")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={locked || loading}
          onClick={() => setOpen(true)}
          className="h-10 cursor-pointer gap-2 rounded-xl border-charcoal/20 bg-white font-semibold shadow-xs"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          {t("entitlements.browsePaths")}
        </Button>
        {selectedIds.length > 0 && !allPaths ? (
          <Button
            type="button"
            variant="ghost"
            disabled={locked}
            onClick={onClear}
            className="h-10 cursor-pointer rounded-xl font-semibold text-charcoal/70"
          >
            {t("entitlements.clearPaths")}
          </Button>
        ) : null}
      </div>

      {error && options.length === 0 ? (
        <p className="text-sm text-destructive">{t("entitlements.pathsError")}</p>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFilterInput("");
            setFilter("");
          }
        }}
      >
        <DialogContent className="flex max-h-[min(36rem,90vh)] w-[min(32rem,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden rounded-2xl border-charcoal/15 p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-1 border-b border-charcoal/10 px-5 py-4 text-left">
            <DialogTitle className="text-lg font-bold text-ink">
              {t("entitlements.pickerTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-charcoal/65">
              {t("entitlements.pickerBody")}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 border-b border-charcoal/10 px-4 py-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-charcoal/40"
                aria-hidden
              />
              <Input
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                placeholder={t("entitlements.filterPlaceholder")}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className={cn(FIELD_CLASS, "h-11 rounded-xl pl-10")}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
            {loading ? (
              <p className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-charcoal/65">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("entitlements.pathsLoading")}
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-charcoal/65">
                {options.length === 0
                  ? t("entitlements.pathsEmpty")
                  : t("entitlements.pathsNoMatch")}
              </p>
            ) : (
              <ul className="space-y-1 pb-2">
                {filtered.map((path) => {
                  const checked = selectedSet.has(path.id);
                  return (
                    <li key={path.id}>
                      <button
                        type="button"
                        onClick={() => onToggle(path.id)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                          checked
                            ? "border-brand/45 bg-brand/[0.07]"
                            : "border-transparent hover:border-charcoal/15 hover:bg-white",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center rounded-md border",
                            checked
                              ? "border-brand bg-brand text-white"
                              : "border-charcoal/25 bg-white",
                          )}
                          aria-hidden
                        >
                          {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
                        </span>
                        <span className="font-jp min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                          {path.label}
                        </span>
                        {path.archived ? (
                          <span className="shrink-0 rounded-md bg-charcoal/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/65 uppercase">
                            {t("entitlements.unlisted")}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-charcoal/10 bg-[var(--workspace-surface)]/70 px-4 py-3">
            <p className="text-xs font-semibold text-charcoal/65 tabular-nums">
              {t("entitlements.selectedCount", { count: selectedIds.length })}
            </p>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 cursor-pointer rounded-xl px-4 font-semibold"
            >
              {t("entitlements.donePaths")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
