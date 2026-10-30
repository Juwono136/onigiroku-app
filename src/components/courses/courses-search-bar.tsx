"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

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
  const [pending, startTransition] = useTransition();
  const tagsKey = tags.join(",");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = value.trim();
      if (next === initialSearch.trim()) return;
      startTransition(() => {
        router.push(
          coursesListHref({
            search: next,
            tags,
            sortBy,
            sortDir,
            page: 1,
          }),
        );
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [value, initialSearch, tags, tagsKey, sortBy, sortDir, router]);

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className={cn(
          "h-11 rounded-2xl border-charcoal/12 bg-white pl-10 pr-10 text-sm text-ink shadow-sm placeholder:text-charcoal/38",
          pending && "opacity-80",
        )}
      />
      {value ? (
        <button
          type="button"
          className="absolute top-1/2 right-2.5 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-charcoal/45 hover:bg-soft hover:text-ink"
          aria-label={t("actions.clearSearch")}
          onClick={() => setValue("")}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
