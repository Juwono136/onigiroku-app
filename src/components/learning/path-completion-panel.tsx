"use client";

import { ArrowRight, Check, PartyPopper, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/routing";
import type { PathCompletion } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type PanelProps = {
  completion: PathCompletion;
  /** Compact card for the path page; dialog for celebration / reopen. */
  variant?: "card" | "dialog";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PathCompletionPanel({
  completion,
  variant = "card",
  open = false,
  onOpenChange,
}: PanelProps) {
  const body = <CompletionBody completion={completion} variant={variant} />;

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-2xl",
            "max-h-[min(92dvh,52rem)] sm:max-w-3xl lg:max-h-[min(88dvh,36rem)] lg:max-w-4xl xl:max-w-5xl",
          )}
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{completion.categoryNameId}</DialogTitle>
            <DialogDescription>Path completed</DialogDescription>
          </DialogHeader>
          {/* Desktop: fixed-height grid avoids a tall scrolling strip; mobile scrolls as needed. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-hidden [scrollbar-width:thin]">
            {body}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-brand/20 bg-white shadow-[0_22px_48px_-34px_rgba(185,28,28,0.28)]">
      {body}
    </section>
  );
}

function CompletionBody({
  completion,
  variant,
}: {
  completion: PathCompletion;
  variant: "card" | "dialog";
}) {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const name =
    locale === "en"
      ? completion.categoryNameEn || completion.categoryNameId
      : completion.categoryNameId || completion.categoryNameEn;
  const avg =
    completion.averageScore != null
      ? Math.round(completion.averageScore)
      : null;
  const nextName = completion.nextPath
    ? locale === "en"
      ? completion.nextPath.nameEn || completion.nextPath.nameId
      : completion.nextPath.nameId || completion.nextPath.nameEn
    : null;

  const isDialog = variant === "dialog";

  return (
    <div
      className={cn(
        "animate-in fade-in zoom-in-95 duration-300",
        isDialog && "lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(17rem,0.95fr)_minmax(0,1.25fr)]",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-brand via-brand to-[#8f1f1f] px-5 py-6 text-white sm:px-7 sm:py-7",
          isDialog && "lg:flex lg:h-full lg:flex-col lg:justify-between lg:py-8",
        )}
      >
        <div
          className="pointer-events-none absolute -top-12 -right-10 size-48 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 size-32 rounded-full bg-black/10 blur-2xl"
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 shadow-sm ring-1 ring-white/40">
              <BrandLogo size={40} alt="Onigiroku" className="drop-shadow-sm" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-white/80 uppercase">
                Onigiroku · {t("completion.eyebrow")}
              </p>
              <h2 className="mt-0.5 text-pretty text-xl font-bold tracking-tight sm:text-2xl">
                {t("completion.title")}
              </h2>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-white/90">
            {t("completion.subtitle", { path: name })}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-white/75">
            <PartyPopper className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
            <span>{t("completion.retakeNote")}</span>
          </p>
        </div>

        <div
          className={cn(
            "relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3",
            isDialog && "lg:mt-8",
          )}
        >
          <Stat
            label={t("completion.lessonsDone")}
            value={`${completion.completedCount}/${completion.lessonCount}`}
          />
          <Stat
            label={t("completion.avgScore")}
            value={avg != null ? `${avg}%` : "—"}
          />
          <Stat
            className="col-span-2 sm:col-span-1"
            label={t("completion.status")}
            value={t("completion.finished")}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 bg-white px-5 py-5 sm:px-7 sm:py-6",
          isDialog && "lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]",
        )}
      >
        <div className="min-h-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            {t("completion.scoreBreakdown")}
          </p>
          <ul
            className={cn(
              "mt-3 space-y-2",
              completion.lessons.length > 2 && "sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0",
            )}
          >
            {completion.lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  href={`/dashboard/materials/${lesson.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] px-3.5 py-2.5 transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {lesson.completed ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      lesson.position
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{lesson.title}</p>
                    <p className="text-[11px] text-charcoal/55">
                      {lesson.readingOnly
                        ? t("completion.readingOnly")
                        : lesson.attemptCount > 0
                          ? t("completion.attempts", { n: lesson.attemptCount })
                          : t("completion.noPractice")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {lesson.latestScore != null ? (
                      <>
                        <p className="text-sm font-bold tabular-nums text-ink">
                          {lesson.latestScore}%
                        </p>
                        <p
                          className={cn(
                            "text-[11px] font-semibold",
                            lesson.passed ? "text-success" : "text-destructive",
                          )}
                        >
                          {lesson.passed
                            ? t("history.passed")
                            : t("history.failedLabel")}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-semibold text-charcoal/50">
                        {lesson.readingOnly ? t("completion.ok") : "—"}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {completion.lessons[0] ? (
            <Link
              href={`/dashboard/materials/${completion.lessons[0].slug}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 cursor-pointer gap-2 rounded-2xl px-5 font-semibold",
              )}
            >
              {t("completion.reviewCta")}
            </Link>
          ) : null}
          {variant === "dialog" ? (
            <Link
              href={`/dashboard/materials/categories/${completion.categorySlug}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 cursor-pointer gap-2 rounded-2xl px-5 font-semibold",
              )}
            >
              {t("completion.viewPath")}
            </Link>
          ) : null}
        </div>

        {completion.nextPath && nextName ? (
          <div className="rounded-2xl border border-charcoal/10 bg-soft/80 p-4 sm:p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
              {t("completion.nextEyebrow")}
            </p>
            <h3 className="mt-1 font-jp text-lg font-bold text-ink">{nextName}</h3>
            <p className="mt-1 text-sm text-charcoal/65">
              {t("completion.nextDescription", {
                done: completion.nextPath.completedCount,
                total: completion.nextPath.lessonCount,
              })}
            </p>
            <Link
              href={`/dashboard/materials/categories/${completion.nextPath.slug}`}
              className={cn(
                buttonVariants(),
                "mt-4 inline-flex h-11 w-full cursor-pointer gap-2 rounded-2xl border-transparent bg-brand px-5 font-semibold text-white hover:bg-brand/90 hover:text-white sm:w-auto",
              )}
            >
              {t("completion.nextCta")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-charcoal/10 bg-soft/80 p-4 text-sm text-charcoal/70 sm:p-5">
            <p className="font-semibold text-ink">{t("completion.allDoneTitle")}</p>
            <p className="mt-1">{t("completion.allDoneBody")}</p>
            <Link
              href="/dashboard/materials"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-4 inline-flex h-11 cursor-pointer gap-2 rounded-2xl px-5 font-semibold",
              )}
            >
              {t("actions.back")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/12 px-3 py-2.5 backdrop-blur-sm",
        className,
      )}
    >
      <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
