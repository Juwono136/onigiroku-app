"use client";

import { ChevronDown, Search, Tags, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import type { MaterialTag } from "@/lib/materials/types";
import {
  newsListHref,
  toggleNewsTag,
} from "@/lib/news/query";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  tags: MaterialTag[];
  /** Currently selected tag slugs (multi-select, OR filter). */
  selectedTags: string[];
  search: string;
  /** How many popular chips to show before collapsing into the picker. */
  visibleCount?: number;
};

function tagLabel(tag: MaterialTag, locale: string) {
  return locale === "en" ? tag.nameEn || tag.nameId : tag.nameId || tag.nameEn;
}

/**
 * Scalable multi-select news tag filters: popular chips + searchable overflow.
 * Selecting multiple tags uses OR matching on the API.
 */
export function NewsTagFilter({
  locale,
  tags,
  selectedTags,
  search,
  visibleCount = 8,
}: Props) {
  const t = useTranslations("news");
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
        <Link
          href={newsListHref({ search })}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
            !hasSelection
              ? "border-brand/30 bg-brand text-white"
              : "border-charcoal/12 bg-white text-charcoal/65 hover:border-brand/25 hover:text-brand",
          )}
        >
          {t("filters.all")}
        </Link>
        {popular.map((chip) => {
          const isActive = selectedSet.has(chip.slug);
          const nextTags = toggleNewsTag(selectedTags, chip.slug);
          return (
            <Link
              key={chip.id}
              href={newsListHref({ search, tags: nextTags })}
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                isActive
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-charcoal/12 bg-white text-charcoal/65 hover:border-brand/25 hover:text-brand",
              )}
            >
              {tagLabel(chip, locale)}
            </Link>
          );
        })}
        {hasOverflow ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="h-8 cursor-pointer gap-1 rounded-full border-charcoal/12 px-3 text-xs font-semibold"
          >
            {open
              ? t("filters.hideTags")
              : t("filters.moreTags", { count: tags.length })}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </Button>
        ) : null}
        {hasSelection ? (
          <Link
            href={newsListHref({ search })}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-charcoal/55 hover:text-brand"
          >
            <X className="size-3.5" aria-hidden />
            {t("filters.clearTag")}
            {selectedTags.length > 1 ? (
              <span className="tabular-nums">({selectedTags.length})</span>
            ) : null}
          </Link>
        ) : null}
      </div>

      {open && hasOverflow ? (
        <div className="rounded-2xl border border-charcoal/10 bg-soft/60 p-3 sm:p-4">
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-charcoal/40"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("filters.searchTags")}
              aria-label={t("filters.searchTags")}
              className="h-10 rounded-xl border-charcoal/12 bg-white pl-9 text-sm"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-1 py-2 text-sm text-charcoal/55">
              {t("filters.noTagMatches")}
            </p>
          ) : (
            <ul className="grid max-h-52 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((chip) => {
                const isActive = selectedSet.has(chip.slug);
                const nextTags = toggleNewsTag(selectedTags, chip.slug);
                return (
                  <li key={chip.id}>
                    <Link
                      href={newsListHref({ search, tags: nextTags })}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                        isActive
                          ? "border-brand/30 bg-brand/10 text-brand"
                          : "border-transparent bg-white/80 text-charcoal/70 hover:border-charcoal/12 hover:text-ink",
                      )}
                    >
                      <span className="truncate">{tagLabel(chip, locale)}</span>
                      {typeof chip.usageCount === "number" ? (
                        <span className="shrink-0 text-[11px] font-medium text-charcoal/40">
                          {chip.usageCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
