"use client";

import { Check, ChevronLeft, ChevronRight, Lock, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { PathLesson } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type Props = {
  categorySlug: string;
  categoryName: string;
  lessons: PathLesson[];
  currentSlug: string;
  completedCount: number;
  lessonCount: number;
};

const STORAGE_KEY = "onigiroku.lesson-sidebar.open";

/** Matches AppTopbar: h-14 / sm:h-16 so the rail sits under the sticky header. */
const TOPBAR_OFFSET =
  "top-14 h-[calc(100dvh-3.5rem)] sm:top-16 sm:h-[calc(100dvh-4rem)]";

export function LessonPathSidebar({
  categorySlug,
  categoryName,
  lessons,
  currentSlug,
  completedCount,
  lessonCount,
}: Props) {
  const t = useTranslations("learningStudent");
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pct = lessonCount
    ? Math.round((completedCount / lessonCount) * 100)
    : 0;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "0") setOpen(false);
      if (raw === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: boolean) {
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-charcoal/10 px-4 py-3.5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
          {t("sidebar.title")}
        </p>
        <Link
          href={`/dashboard/materials/categories/${categorySlug}`}
          className="mt-1 block truncate text-sm font-bold text-ink hover:text-brand"
          onClick={() => setMobileOpen(false)}
        >
          {categoryName}
        </Link>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal/55">
            <span>
              {t("sidebar.progress", {
                done: completedCount,
                total: lessonCount,
              })}
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-charcoal/10">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2.5 py-3">
        {lessons.map((lesson, index) => {
          const current = lesson.slug === currentSlug;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  lesson.completed
                    ? "bg-brand text-white"
                    : lesson.locked
                      ? "bg-charcoal/10 text-charcoal/40"
                      : current
                        ? "bg-brand text-white"
                        : "bg-brand/10 text-brand",
                )}
              >
                {lesson.completed ? (
                  <Check className="size-3.5" />
                ) : lesson.locked ? (
                  <Lock className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {lesson.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-charcoal/55">
                  {current
                    ? t("sidebar.current")
                    : lesson.completed
                      ? t("lesson.done")
                      : lesson.locked
                        ? t("lesson.locked")
                        : lesson.inProgress
                          ? t("lesson.continue")
                          : t("lesson.start")}
                </span>
              </span>
            </>
          );
          if (lesson.locked && !current) {
            return (
              <li key={lesson.id} className="transition-opacity duration-300">
                <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 opacity-60">
                  {content}
                </div>
              </li>
            );
          }
          return (
            <li key={lesson.id} className="animate-in fade-in duration-300">
              <Link
                href={`/dashboard/materials/${lesson.slug}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition",
                  current
                    ? "bg-brand/10 ring-1 ring-brand/25"
                    : "hover:bg-[var(--workspace-surface)]",
                )}
                aria-current={current ? "page" : undefined}
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <>
      {/* Desktop: stick below AppTopbar (z below topbar so navbar stays usable) */}
      <aside
        className={cn(
          "sticky z-10 hidden shrink-0 self-start border-r border-charcoal/10 bg-white/95 backdrop-blur transition-[width] duration-300 lg:block",
          TOPBAR_OFFSET,
          open ? "w-[18.5rem]" : "w-12",
        )}
      >
        {open ? (
          <div className="relative h-full">
            {list}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute top-3 -right-3 z-10 size-7 cursor-pointer rounded-full border-charcoal/15 bg-white shadow-sm"
              aria-label={t("actions.collapseSidebar")}
              onClick={() => persist(false)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center gap-3 py-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer rounded-xl"
              aria-label={t("actions.expandSidebar")}
              onClick={() => persist(true)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <span
              className="mt-2 text-[10px] font-semibold tracking-[0.18em] text-charcoal/45 uppercase"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {t("actions.toggleSidebar")}
            </span>
          </div>
        )}
      </aside>

      {/* Mobile floating toggle + sheet */}
      <div className="lg:hidden">
        <Button
          type="button"
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-30 h-11 max-w-[min(12.5rem,calc(100vw-5.5rem))] cursor-pointer gap-2 rounded-full border border-charcoal/10 bg-white px-3.5 font-semibold text-ink shadow-[0_12px_28px_-12px_rgba(24,24,27,0.45)] hover:bg-[var(--workspace-surface)] hover:text-brand"
          onClick={() => setMobileOpen(true)}
          aria-label={t("actions.toggleSidebar")}
        >
          <Menu className="size-4 shrink-0 text-brand" />
          <span className="truncate text-sm">{t("actions.toggleSidebar")}</span>
        </Button>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              className="absolute inset-0 cursor-pointer bg-ink/40"
              aria-label={t("actions.collapseSidebar")}
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-charcoal/10 px-3 py-2">
                <p className="text-sm font-bold text-ink">
                  {t("actions.toggleSidebar")}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 cursor-pointer rounded-xl"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("actions.collapseSidebar")}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1">{list}</div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
