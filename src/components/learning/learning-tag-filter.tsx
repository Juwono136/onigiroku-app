"use client";

import { ChevronDown, Search, Tags, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LearningCategoryTag } from "@/lib/learning/types";
import { toggleLearningTag } from "@/lib/learning/query";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  tags: LearningCategoryTag[];
  selectedTags: string[];
  onChange: (next: string[]) => void;
  visibleCount?: number;
};

function tagLabel(tag: LearningCategoryTag, locale: string) {
  return locale === "en" ? tag.nameEn || tag.nameId : tag.nameId || tag.nameEn;
}

export function LearningTagFilter({
  locale,
  tags,
  selectedTags,
  onChange,
  visibleCount = 8,
}: Props) {
  const t = useTranslations("learningStudent");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const selectedObjects = useMemo(
    () => tags.filter((tag) => selectedSet.has(tag.slug)),
    [selectedSet, tags],
  );

  const popular = useMemo(() => {
    const base = tags.slice(0, visibleCount);
    const extras = selectedObjects.filter(
      (tag) => !base.some((b) => b.id === tag.id),
    );
    return [...extras, ...base].slice(0, visibleCount + extras.length);
  }, [selectedObjects, tags, visibleCount]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => {
      const label = tagLabel(tag, locale).toLowerCase();
      return (
        label.includes(q) ||
        tag.slug.includes(q) ||
        tag.nameId.toLowerCase().includes(q) ||
        tag.nameEn.toLowerCase().includes(q)
      );
    });
  }, [locale, query, tags]);

  const hasOverflow = tags.length > visibleCount;
  const hasSelection = selectedTags.length > 0;

  if (tags.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
          <Tags className="size-3.5" aria-hidden />
          {t("filters.tags")}
        </span>
        <span className="text-[11px] text-charcoal/40">{t("filters.multiHint")}</span>
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
            !hasSelection
              ? "border-brand/30 bg-brand text-white"
              : "border-charcoal/12 bg-white text-charcoal/65 hover:border-brand/25 hover:text-brand",
          )}
        >
          {t("filters.all")}
        </button>
        {popular.map((chip) => {
          const isActive = selectedSet.has(chip.slug);
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(toggleLearningTag(selectedTags, chip.slug))}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                isActive
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-charcoal/12 bg-white text-charcoal/65 hover:border-brand/25 hover:text-brand",
              )}
            >
              {tagLabel(chip, locale)}
            </button>
          );
        })}
        {hasOverflow ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 cursor-pointer gap-1 rounded-full px-2.5 text-xs font-semibold"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {t("filters.more")}
            <ChevronDown
              className={cn("size-3.5 transition", open && "rotate-180")}
              aria-hidden
            />
          </Button>
        ) : null}
        {hasSelection ? (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-charcoal/55 hover:text-brand"
            onClick={() => onChange([])}
          >
            <X className="size-3.5" aria-hidden />
            {t("filters.clear")}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="rounded-2xl border border-charcoal/10 bg-white p-3 shadow-sm">
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-charcoal/40"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("filters.searchTags")}
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-auto">
            {filtered.map((tag) => {
              const isActive = selectedSet.has(tag.slug);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    onChange(toggleLearningTag(selectedTags, tag.slug))
                  }
                  className={cn(
                    "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    isActive
                      ? "border-brand/30 bg-brand/10 text-brand"
                      : "border-charcoal/12 bg-white text-charcoal/65 hover:border-brand/25 hover:text-brand",
                  )}
                >
                  {tagLabel(tag, locale)}
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="px-1 py-2 text-xs text-charcoal/50">
                {t("empty.filtered")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
