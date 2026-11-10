"use client";

import { ChevronDown, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { PublicCourseLesson } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 6;

type Props = {
  lessons: PublicCourseLesson[];
};

export function PublicLessonList({ lessons }: Props) {
  const t = useTranslations("courses");
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = lessons.length > PREVIEW_COUNT;

  const visible = useMemo(() => {
    if (!needsCollapse || expanded) return lessons;
    return lessons.slice(0, PREVIEW_COUNT);
  }, [expanded, lessons, needsCollapse]);

  const hidden = Math.max(0, lessons.length - visible.length);
  const listScrollable = expanded && lessons.length > 10;

  if (lessons.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-charcoal/55">
        {t("detail.noLessons")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-charcoal/8 pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{t("detail.lessonList")}</h2>
          <p className="mt-1 text-xs text-charcoal/55">{t("detail.lessonListHint")}</p>
        </div>
        <p className="shrink-0 text-[11px] font-semibold tabular-nums text-charcoal/45">
          {t("detail.lessonListCount", { count: lessons.length })}
        </p>
      </div>

      <ol
        className={cn(
          "space-y-2.5",
          // Scroll only when expanded & long — avoid empty overflow traps.
          listScrollable &&
            "max-h-[min(22rem,50vh)] overflow-y-auto pr-1 [scrollbar-width:thin]",
        )}
      >
        {visible.map((lesson) => (
          <li
            key={lesson.slug}
            className="flex gap-3 rounded-2xl border border-charcoal/8 bg-[var(--workspace-surface)]/70 p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-brand shadow-sm tabular-nums">
              {lesson.position}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-jp line-clamp-2 text-sm font-semibold text-ink">
                  {lesson.title}
                </p>
                <Lock
                  className="mt-0.5 size-3.5 shrink-0 text-charcoal/35"
                  aria-hidden
                />
              </div>
              {lesson.excerpt ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-charcoal/55">
                  {lesson.excerpt}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {needsCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-charcoal/12 bg-[var(--workspace-surface)] px-3 text-sm font-semibold text-charcoal/75 transition hover:border-brand/25 hover:bg-brand/5 hover:text-brand"
          aria-expanded={expanded}
        >
          {expanded
            ? t("detail.showLessLessons")
            : t("detail.showAllLessons", { count: lessons.length })}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
          {hidden > 0 && !expanded ? (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand tabular-nums">
              +{hidden}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
