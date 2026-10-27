"use client";

import { ArrowLeft, Check, ChevronRight, History, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { RichTextView } from "@/components/learning/rich-text-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  QuizAttemptDetail,
  QuizAttemptListResult,
  QuizAttemptSummary,
  QuestionReview,
} from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
};

function formatAttemptDate(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function PracticeHistoryDialog({ open, onOpenChange, slug }: Props) {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<QuizAttemptListResult | null>(null);
  const [detail, setDetail] = useState<QuizAttemptDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setDetail(null);
    try {
      const res = await fetch(
        `/api/materials/${encodeURIComponent(slug)}/quiz/attempts?limit=50`,
        { credentials: "same-origin" },
      );
      const payload = (await res.json()) as {
        data?: QuizAttemptListResult;
        error?: { message?: string };
      };
      if (!res.ok || !payload.data) {
        setError(payload.error?.message ?? t("history.failed"));
        setData(null);
        return;
      }
      setData(payload.data);
    } catch {
      setError(t("history.failed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  const loadDetail = useCallback(
    async (attemptId: string) => {
      setDetailLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/materials/${encodeURIComponent(slug)}/quiz/attempts/${encodeURIComponent(attemptId)}`,
          { credentials: "same-origin" },
        );
        const payload = (await res.json()) as {
          data?: QuizAttemptDetail;
          error?: { message?: string };
        };
        if (!res.ok || !payload.data) {
          setError(payload.error?.message ?? t("history.detailFailed"));
          return;
        }
        setDetail(payload.data);
      } catch {
        setError(t("history.detailFailed"));
      } finally {
        setDetailLoading(false);
      }
    },
    [slug, t],
  );

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDetail(null);
      setError("");
    }
    onOpenChange(next);
  }

  const showingDetail = Boolean(detail) || detailLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,46rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-xl sm:max-w-xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 gap-2 border-b border-charcoal/10 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          {showingDetail ? (
            <div className="flex items-start gap-2 pr-8">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 size-9 shrink-0 cursor-pointer rounded-xl"
                onClick={() => {
                  setDetail(null);
                  setError("");
                }}
                aria-label={t("history.back")}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold tracking-tight text-ink">
                  {detail
                    ? t("history.attempt", { n: detail.attemptNumber })
                    : t("history.detailLoading")}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed text-charcoal/70">
                  {detail
                    ? t("history.detailDescription", {
                        score: detail.score,
                        pass: detail.passScore,
                      })
                    : t("history.detailLoading")}
                </DialogDescription>
              </div>
            </div>
          ) : (
            <>
              <DialogTitle className="flex items-center gap-2 pr-8 text-lg font-bold tracking-tight text-ink">
                <History className="size-5 text-brand" aria-hidden />
                {t("history.title")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-charcoal/70">
                {t("history.description")}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-charcoal/60">
              <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
              <p className="text-sm font-medium">{t("history.detailLoading")}</p>
            </div>
          ) : detail ? (
            <AttemptDetailBody detail={detail} locale={locale} />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-charcoal/60">
              <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
              <p className="text-sm font-medium">{t("history.loading")}</p>
            </div>
          ) : error ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                className="h-10 cursor-pointer rounded-xl font-semibold"
                onClick={() => void load()}
              >
                {t("history.retry")}
              </Button>
            </div>
          ) : !data?.items.length ? (
            <p className="py-10 text-center text-sm text-charcoal/60">{t("history.empty")}</p>
          ) : (
            <ul className="space-y-2.5">
              {data.items.map((item, index) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  latest={index === 0}
                  locale={locale}
                  onOpen={() => void loadDetail(item.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {!showingDetail && data && data.total > 0 ? (
          <div className="shrink-0 border-t border-charcoal/10 bg-soft/60 px-5 py-3 text-center text-xs font-medium text-charcoal/55 sm:px-6">
            {t("history.footer", { total: data.total })}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HistoryRow({
  item,
  latest,
  locale,
  onOpen,
}: {
  item: QuizAttemptSummary;
  latest: boolean;
  locale: string;
  onOpen: () => void;
}) {
  const t = useTranslations("learningStudent");
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
          latest
            ? "border-brand/25 bg-brand/5 hover:bg-brand/10"
            : "border-charcoal/10 bg-white hover:border-brand/20 hover:bg-[var(--workspace-surface)]",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            item.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
          )}
          aria-hidden
        >
          {item.passed ? <Check className="size-4" /> : <X className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-bold text-ink">
              {t("history.attempt", { n: item.attemptNumber })}
            </p>
            {latest ? (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand uppercase">
                {t("history.latest")}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-charcoal/55">
            {formatAttemptDate(item.createdAt, locale)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-brand/80">{t("history.viewDetail")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-ink">{item.score}%</p>
          <p
            className={cn(
              "text-[11px] font-semibold",
              item.passed ? "text-success" : "text-destructive",
            )}
          >
            {item.passed ? t("history.passed") : t("history.failedLabel")}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-charcoal/35" aria-hidden />
      </button>
    </li>
  );
}

function AttemptDetailBody({
  detail,
  locale,
}: {
  detail: QuizAttemptDetail;
  locale: string;
}) {
  const t = useTranslations("learningStudent");
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] px-3.5 py-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold",
            detail.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {detail.passed ? t("history.passed") : t("history.failedLabel")}
        </span>
        <span className="text-sm font-bold tabular-nums text-ink">{detail.score}%</span>
        <span className="text-xs text-charcoal/55">
          {formatAttemptDate(detail.createdAt, locale)}
        </span>
      </div>

      <ol className="space-y-3">
        {detail.reviews.map((review, index) => (
          <li key={review.id}>
            <HistoryQuestionCard
              review={review}
              index={index + 1}
              total={detail.reviews.length}
              locale={locale}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function HistoryQuestionCard({
  review,
  index,
  total,
  locale,
}: {
  review: QuestionReview;
  index: number;
  total: number;
  locale: string;
}) {
  const t = useTranslations("learningStudent");
  const prompt = locale === "en" ? review.promptEn || review.promptId : review.promptId || review.promptEn;
  const explanation =
    locale === "en"
      ? review.explanationEn || review.explanationId || ""
      : review.explanationId || review.explanationEn || "";
  const label = (id: string, en: string) => (locale === "en" ? en || id : id || en);
  const correctOption = review.options.find((o) => o.id === review.correctOptionId);
  const flashAnswer = label(review.answerId ?? "", review.answerEn ?? "");

  return (
    <article className="rounded-2xl border border-charcoal/10 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
          {t("quiz.questionOf", { index, total })}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
            review.correct ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {review.correct ? <Check className="size-3" /> : <X className="size-3" />}
          {review.correct ? t("quiz.correct") : t("quiz.incorrect")}
        </span>
      </div>
      <div className="mt-2">
        <RichTextView value={prompt} className="text-sm font-semibold text-ink" />
      </div>

      {review.type === "multiple_choice" ? (
        <ul className="mt-3 space-y-1.5">
          {review.options.map((option) => {
            const isSelected = option.id === review.selectedOptionId;
            const isCorrect = option.id === review.correctOptionId;
            return (
              <li
                key={option.id}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  isCorrect
                    ? "border-success/30 bg-success/10 text-ink"
                    : isSelected
                      ? "border-destructive/30 bg-destructive/8 text-ink"
                      : "border-charcoal/8 bg-[var(--workspace-surface)]/60 text-charcoal/70",
                )}
              >
                <span className="font-medium">
                  {label(option.labelId, option.labelEn)}
                </span>
                {isSelected || isCorrect ? (
                  <span className="ml-2 text-[11px] font-bold">
                    {isCorrect
                      ? t("history.correctChoice")
                      : t("history.yourChoice")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {review.type === "short_answer" ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-charcoal/10 bg-[var(--workspace-surface)] px-3 py-2">
            <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
              {t("history.yourAnswer")}
            </p>
            <p className="mt-1 font-jp text-sm font-semibold text-ink">
              {review.textAnswer?.trim() || "—"}
            </p>
          </div>
          {(review.acceptedAnswers?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-success/20 bg-success/8 px-3 py-2">
              <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
                {t("quiz.acceptedShow")}
              </p>
              <ul className="mt-1 space-y-1">
                {review.acceptedAnswers!.map((line) => (
                  <li key={line} className="font-jp text-sm font-semibold text-ink">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {review.type === "flashcard" ? (
        <div className="mt-3 space-y-2">
          {flashAnswer ? (
            <div className="rounded-xl border border-charcoal/10 bg-[var(--workspace-surface)] px-3 py-2">
              <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
                {t("quiz.cardBack")}
              </p>
              <RichTextView value={flashAnswer} className="mt-1 text-sm text-ink" />
            </div>
          ) : null}
          <p
            className={cn(
              "text-sm font-semibold",
              review.knew ? "text-success" : "text-destructive",
            )}
          >
            {review.knew == null
              ? "—"
              : review.knew
                ? t("quiz.knew")
                : t("quiz.learning")}
          </p>
        </div>
      ) : null}

      {review.type === "multiple_choice" && !review.correct && correctOption ? (
        <p className="mt-2 text-sm text-ink">
          <span className="font-semibold text-charcoal/60">{t("quiz.correctAnswerLabel")}</span>{" "}
          <span className="font-semibold text-success">
            {label(correctOption.labelId, correctOption.labelEn)}
          </span>
        </p>
      ) : null}

      {explanation ? (
        <div className="mt-3 border-t border-charcoal/10 pt-3">
          <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">
            {t("quiz.explanation")}
          </p>
          <RichTextView value={explanation} className="mt-1 text-sm text-charcoal/80" />
        </div>
      ) : null}
    </article>
  );
}
