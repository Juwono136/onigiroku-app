"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { RichTextView } from "@/components/learning/rich-text-view";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  emptyLabel: string;
};

const COLLAPSED_MAX = 220;

export function PathDescription({ value, emptyLabel }: Props) {
  const t = useTranslations("courses");
  const trimmed = value.trim();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      if (expanded) return;
      setOverflows(el.scrollHeight > COLLAPSED_MAX + 8);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // TipTap may paint after first layout.
    const t1 = window.setTimeout(measure, 50);
    const t2 = window.setTimeout(measure, 250);
    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [trimmed, expanded]);

  if (!trimmed) {
    return <p className="text-sm text-charcoal/55">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className={cn(
          "relative text-charcoal/75",
          !expanded && overflows && "max-h-[220px] overflow-hidden",
        )}
      >
        <RichTextView value={trimmed} className="text-charcoal/75" />
        {!expanded && overflows ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-brand transition hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? t("detail.showLessDescription") : t("detail.showMoreDescription")}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
