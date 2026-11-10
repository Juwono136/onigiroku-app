"use client";

import { Tags, X } from "lucide-react";
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

  const popular = catalog.slice(0, 10);

  return (
    <div className={cn("relative space-y-3.5", pending && "opacity-80")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="mr-1 text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
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
            data-active={sortBy === key}
            className="path-sort-tab"
          >
            {label}
          </button>
        ))}
      </div>

      {popular.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
              <Tags className="size-3.5" aria-hidden />
              {t("filters.tags")}
            </p>
            {selectedTags.length > 0 ? (
              <Link
                href={coursesListHref({ search, sortBy, sortDir, page: 1 })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <X className="size-3.5" aria-hidden />
                {t("actions.clearFilters")}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {popular.map((tag) => {
              const active = selectedTags.includes(tag.slug);
              const label =
                locale === "en"
                  ? tag.nameEn || tag.nameId
                  : tag.nameId || tag.nameEn;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.slug)}
                  data-active={active}
                  aria-pressed={active}
                  className="path-tag-chip"
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
