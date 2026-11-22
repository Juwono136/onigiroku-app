"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";
import { classesListHref } from "@/lib/packages/query";
import { cn } from "@/lib/utils";

type Props = {
  initialSearch: string;
};

const DEBOUNCE_MS = 400;

/** Debounced search synced to `/classes?q=` (no sort — catalog stays simple). */
export function ClassesToolbar({ initialSearch }: Props) {
  const t = useTranslations("classesPage");
  const router = useRouter();
  const [value, setValue] = useState(initialSearch);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    const frame = requestAnimationFrame(() => setValue(initialSearch));
    return () => cancelAnimationFrame(frame);
  }, [initialSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = value.trim();
      if (next === initialSearch.trim()) return;
      startTransition(() => {
        router.replace(classesListHref({ search: next, page: 1 }));
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, initialSearch, router]);

  return (
    <div className={cn("relative min-w-0", pending && "opacity-80")}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        autoComplete="off"
        spellCheck={false}
        className="h-12 rounded-2xl border-charcoal/15 bg-white pl-10 pr-10 text-sm text-ink shadow-sm placeholder:text-charcoal/38 focus-visible:border-brand/40"
      />
      {value ? (
        <button
          type="button"
          className="absolute top-1/2 right-2.5 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-charcoal/45 hover:bg-soft hover:text-ink"
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
