"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";
import { coursesListHref } from "@/lib/courses/query";
import { cn } from "@/lib/utils";

type Props = {
  initialSearch: string;
  tags: string[];
  sortBy: string;
  sortDir: string;
  className?: string;
};

const DEBOUNCE_MS = 400;

/** Debounced search synced to `/learning-path?q=` without remounting / stealing focus. */
export function CoursesSearchBar({
  initialSearch,
  tags,
  sortBy,
  sortDir,
  className,
}: Props) {
  const t = useTranslations("courses");
  const router = useRouter();
  const [value, setValue] = useState(initialSearch);
  const [focused, setFocused] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const tagsKey = tags.join(",");
  const filtersKey = `${tagsKey}::${sortBy}::${sortDir}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);

  // Adopt URL search when tags/sort change (link navigation) without remounting.
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPrevInitialSearch(initialSearch);
    setValue(initialSearch);
  } else if (initialSearch !== prevInitialSearch && !focused) {
    // Browser back/forward while the field is not focused.
    setPrevInitialSearch(initialSearch);
    setValue(initialSearch);
  } else if (initialSearch !== prevInitialSearch && focused) {
    // Keep typing; only advance the tracked URL value so debounce still compares correctly.
    setPrevInitialSearch(initialSearch);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = value.trim();
      if (next === initialSearch.trim()) return;
      startTransition(() => {
        router.replace(
          coursesListHref({
            search: next,
            tags,
            sortBy,
            sortDir,
            page: 1,
          }),
        );
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, initialSearch, router, tags, sortBy, sortDir]);

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-11 rounded-xl border-charcoal/15 bg-white/90 pl-10 pr-10 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-charcoal/38 focus-visible:border-brand/40",
          pending && "opacity-80",
        )}
      />
      {value ? (
        <button
          type="button"
          className="absolute top-1/2 right-2.5 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-charcoal/45 hover:bg-soft hover:text-ink"
          aria-label={t("actions.clearSearch")}
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
