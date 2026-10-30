"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Link, useRouter } from "@/i18n/routing";
import { coursesListHref } from "@/lib/courses/query";
import type { LearningCategoryTag } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  catalog: LearningCategoryTag[];
  selectedTags: string[];
  search: string;
  sortBy: string;
  sortDir: string;
};

export function CoursesFilters({
  locale,
  catalog,
  selectedTags,
  search,
  sortBy,
  sortDir,
}: Props) {
  const t = useTranslations("courses");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleTag(slug: string) {
    const next = selectedTags.includes(slug)
      ? selectedTags.filter((s) => s !== slug)
      : [...selectedTags, slug].slice(0, 12);
    startTransition(() => {
      router.push(
        coursesListHref({
          search,
          tags: next,
          sortBy,
          sortDir,
          page: 1,
        }),
      );
    });
  }

  function setSort(nextSort: string) {
    startTransition(() => {
      router.push(
        coursesListHref({
          search,
          tags: selectedTags,
          sortBy: nextSort,
          sortDir: nextSort === "popular" ? "desc" : "asc",
          page: 1,
        }),
      );
    });
  }

  const popular = catalog.slice(0, 8);

  return (
    <div className={cn("space-y-4", pending && "opacity-80")}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
          {t("sort.label")}
        </p>
        {(
          [
            ["position", t("sort.position")],
            ["popular", t("sort.popular")],
            ["name", t("sort.name")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "h-9 cursor-pointer rounded-full px-3.5 text-xs font-semibold transition",
              sortBy === key
                ? "bg-brand text-white shadow-sm"
                : "border border-charcoal/12 bg-white text-charcoal/70 hover:border-brand/30 hover:text-brand",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {popular.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
              {t("filters.tags")}
            </p>
            {selectedTags.length > 0 ? (
              <Link
                href={coursesListHref({ search, sortBy, sortDir, page: 1 })}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {t("actions.clearFilters")}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {popular.map((tag) => {
              const active = selectedTags.includes(tag.slug);
              const label =
                locale === "en" ? tag.nameEn || tag.nameId : tag.nameId || tag.nameEn;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.slug)}
                  className={cn(
                    "h-9 cursor-pointer rounded-full px-3.5 text-xs font-semibold transition",
                    active
                      ? "bg-brand/12 text-brand ring-1 ring-brand/30"
                      : "border border-charcoal/12 bg-white text-charcoal/70 hover:border-brand/25 hover:text-brand",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
