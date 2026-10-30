"use client";

import { ArrowRight, History, Loader2, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PathCompletionPanel } from "@/components/learning/path-completion-panel";
import { PracticeHistoryDialog } from "@/components/learning/practice-history-dialog";
import { PracticeSession } from "@/components/learning/practice-session";
import { emitPracticePassed } from "@/components/learning/student-lesson-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useRouter } from "@/i18n/routing";
import type { PracticeAnswer, PracticeItem, PracticeResultView } from "@/lib/learning/practice";
import { withPracticeShuffle } from "@/lib/learning/practice";
import type { PathCompletion, QuestionPublic, QuizSubmitResult } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  categorySlug: string;
  questions: QuestionPublic[];
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  completed: boolean;
  lessonCount: number;
  completedCount: number;
  nextSlug: string | null;
  nextLocked: boolean;
  /** Persistent path summary when this path is already finished. */
  initialCompletion?: PathCompletion | null;
};

export function LessonPractice({
  slug,
  categorySlug,
  questions,
  shuffleQuestions = false,
  shuffleChoices = false,
  completed,
  lessonCount,
  completedCount,
  nextSlug,
  nextLocked,
  initialCompletion = null,
}: Props) {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [pathDone, setPathDone] = useState(completedCount);
  const [lessonCompleted, setLessonCompleted] = useState(completed);
  const [nextOpen, setNextOpen] = useState(Boolean(nextSlug) && !nextLocked);
  const [retryOpen, setRetryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completion, setCompletion] = useState<PathCompletion | null>(initialCompletion);
  const sent = useRef(0);

  const pct = lessonCount ? Math.round((pathDone / lessonCount) * 100) : 0;
  const resolvedNextSlug = result?.nextSlug ?? nextSlug;
  const canGoNext = Boolean(resolvedNextSlug) && (nextOpen || (result ? !result.nextLocked : !nextLocked));
  const pathFullyDone = lessonCount > 0 && pathDone >= lessonCount;

  useEffect(() => {
    setPathDone(completedCount);
    setLessonCompleted(completed);
    setNextOpen(Boolean(nextSlug) && !nextLocked);
    if (initialCompletion) setCompletion(initialCompletion);
  }, [completedCount, completed, nextSlug, nextLocked, initialCompletion]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const next = max <= 0 ? 100 : Math.min(100, Math.round((doc.scrollTop / max) * 100));
      setPercent(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (percent < sent.current + 15 && percent < 100) return;
    sent.current = percent;
    void fetch(`/api/materials/${encodeURIComponent(slug)}/progress`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readingPercent: percent }),
    });
  }, [percent, slug]);

  const prompt = (q: QuestionPublic) => (locale === "en" ? q.promptEn || q.promptId : q.promptId || q.promptEn);
  const label = (id: string, en: string) => (locale === "en" ? en || id : id || en);

  const practiceItems: PracticeItem[] = useMemo(() => {
    const base = questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: prompt(question),
      options: question.options.map((option) => ({
        id: option.id,
        label: label(option.labelId, option.labelEn),
      })),
      cardBack: question.type === "flashcard" ? label(question.answerId ?? "", question.answerEn ?? "") : undefined,
    }));
    if (sessionKey === 0) return base;
    return withPracticeShuffle(base, shuffleQuestions, shuffleChoices);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locale-driven labels rebuild when locale/questions change
  }, [questions, locale, sessionKey, shuffleQuestions, shuffleChoices]);

  const resultView: PracticeResultView | null = result
    ? {
        score: result.score,
        passed: result.passed,
        passScore: result.passScore,
        reviews: result.reviews.map((review) => {
          const correctOption = review.options.find((option) => option.id === review.correctOptionId);
          return {
            id: review.id,
            correct: review.correct,
            explanation: label(review.explanationId ?? "", review.explanationEn ?? ""),
            answer: review.type === "short_answer"
              ? (review.acceptedAnswers ?? []).join("\n")
              : label(review.answerId ?? "", review.answerEn ?? ""),
            correctOptionId: review.correctOptionId ?? "",
            correctOptionLabel: correctOption ? label(correctOption.labelId, correctOption.labelEn) : "",
          };
        }),
      }
    : null;

  function startRetry() {
    setRetryOpen(false);
    setResult(null);
    setSessionKey((key) => key + 1);
  }

  async function submit(answers: PracticeAnswer[]) {
    setSubmitting(true);
    try {
      const byId = new Map(answers.map((answer) => [answer.id, answer]));
      const res = await fetch(`/api/materials/${encodeURIComponent(slug)}/quiz`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: crypto.randomUUID(),
          answers: questions.map((question) => {
            const answer = byId.get(question.id);
            return {
              questionId: question.id,
              selectedOptionId: answer?.selectedOptionId ?? "",
              textAnswer: answer?.textAnswer ?? "",
              knew: question.type === "flashcard" ? answer?.knew ?? null : null,
            };
          }),
        }),
      });
      const payload = (await res.json()) as { data?: QuizSubmitResult; error?: { message?: string } };
      if (!res.ok || !payload.data) {
        toast.error(payload.error?.message ?? t("quiz.failed"));
        return;
      }
      setResult(payload.data);
      if (payload.data.passed) {
        const wasComplete = lessonCompleted;
        setLessonCompleted(true);
        setNextOpen(true);
        let nextDone = pathDone;
        if (!wasComplete) {
          nextDone = Math.min(lessonCount, pathDone + 1);
          setPathDone(nextDone);
        }
        emitPracticePassed(slug);
        router.refresh();
        if (payload.data.pathCompleted && payload.data.completion) {
          setCompletion(payload.data.completion);
          setCompletionOpen(true);
          toast.success(t("completion.toast"));
        } else {
          toast.success(t("quiz.passed"));
        }
      } else if (lessonCompleted) {
        toast.success(t("quiz.savedLatest"));
      } else {
        toast.message(t("quiz.retry"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  /** Outline = sits beside Submit without competing; solid brand = main CTA after results. */
  function nextLessonCta(tone: "primary" | "secondary") {
    const secondary = tone === "secondary";
    if (canGoNext && resolvedNextSlug) {
      return (
        <Link
          href={`/dashboard/materials/${resolvedNextSlug}`}
          className={cn(
            buttonVariants({ variant: secondary ? "outline" : "default" }),
            "h-11 w-full cursor-pointer gap-2 rounded-2xl px-5 font-semibold sm:w-auto",
            secondary
              ? "border-charcoal/20 bg-white text-ink hover:border-brand/30 hover:bg-white hover:text-brand"
              : "border-transparent bg-brand text-white hover:bg-brand/90 hover:text-white shadow-sm",
          )}
        >
          {t("lesson.next")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      );
    }
    if (pathFullyDone && completion) {
      return (
        <Button
          type="button"
          variant={secondary ? "outline" : "default"}
          className={cn(
            "h-11 w-full cursor-pointer gap-2 rounded-2xl px-5 font-semibold sm:w-auto",
            secondary
              ? "border-charcoal/20 bg-white text-ink hover:border-brand/30 hover:bg-white hover:text-brand"
              : "border-transparent bg-brand text-white hover:bg-brand/90",
          )}
          onClick={() => setCompletionOpen(true)}
        >
          <Trophy className="size-4" aria-hidden />
          {t("completion.openSummary")}
        </Button>
      );
    }
    if (pathFullyDone) {
      return (
        <Link
          href={`/dashboard/materials/categories/${categorySlug}`}
          className={cn(
            buttonVariants({ variant: secondary ? "outline" : "default" }),
            "h-11 w-full cursor-pointer gap-2 rounded-2xl px-5 font-semibold sm:w-auto",
            secondary
              ? "border-charcoal/20 bg-white text-ink hover:border-brand/30 hover:bg-white hover:text-brand"
              : "border-transparent bg-brand text-white hover:bg-brand/90 hover:text-white shadow-sm",
          )}
        >
          {t("completion.viewPath")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      );
    }
    return null;
  }

  const historyButton = questions.length > 0 ? (
    <Button
      type="button"
      variant="outline"
      className="h-10 cursor-pointer gap-2 rounded-xl px-3.5 font-semibold"
      onClick={() => setHistoryOpen(true)}
    >
      <History className="size-4" aria-hidden />
      {t("history.open")}
    </Button>
  ) : null;

  const pathSummaryButton =
    pathFullyDone && completion ? (
      <Button
        type="button"
        variant="outline"
        className="h-10 cursor-pointer gap-2 rounded-xl border-brand/25 px-3.5 font-semibold text-brand hover:bg-brand/5"
        onClick={() => setCompletionOpen(true)}
      >
        <Trophy className="size-4" aria-hidden />
        {t("completion.openSummary")}
      </Button>
    ) : null;

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-2xl border border-charcoal/10 bg-white px-4 py-3">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-charcoal/60">
          <span>{t("pathProgress")}</span>
          <div className="flex items-center gap-2">
            {pathSummaryButton}
            <span className="tabular-nums">{pct}%</span>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-charcoal/10">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-[1.25rem] border border-charcoal/10 bg-white p-5">
          <p className="font-semibold text-ink">{lessonCompleted ? t("lesson.done") : t("lesson.opened")}</p>
          {nextLessonCta("primary") ? (
            <div className="mt-4 flex justify-stretch sm:justify-end">{nextLessonCta("primary")}</div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">{t("quiz.eyebrow")}</p>
              <h2 className="mt-1 text-xl font-bold text-ink">{t("quiz.title")}</h2>
              <p className="mt-1 text-sm text-charcoal/65">{t("quiz.subtitle")}</p>
            </div>
            {historyButton}
          </div>
          <PracticeSession
            key={sessionKey}
            questions={practiceItems}
            result={resultView}
            submitting={submitting}
            submitLabel={t("quiz.submit")}
            onSubmit={(answers) => {
              void submit(answers);
            }}
            onRetry={result ? () => setRetryOpen(true) : undefined}
            nextSlot={
              result
                ? nextLessonCta("primary")
                : lessonCompleted || pathFullyDone
                  ? nextLessonCta("secondary")
                  : null
            }
          />
        </div>
      )}

      <Dialog open={retryOpen} onOpenChange={setRetryOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-xl sm:max-w-md"
          showCloseButton
        >
          <DialogHeader className="gap-2.5 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <DialogTitle className="pr-8 text-lg font-bold tracking-tight text-ink">
              {t("quiz.retryTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-charcoal/75">
              {t("quiz.retryDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2.5 border-t border-charcoal/10 bg-soft/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer rounded-xl px-5 font-semibold"
              onClick={() => setRetryOpen(false)}
            >
              {t("quiz.retryCancel")}
            </Button>
            <Button
              type="button"
              className="h-11 cursor-pointer rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand/90"
              onClick={startRetry}
            >
              {t("quiz.retryConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PracticeHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} slug={slug} />

      {completion ? (
        <PathCompletionPanel
          variant="dialog"
          completion={completion}
          open={completionOpen}
          onOpenChange={setCompletionOpen}
        />
      ) : null}

      {submitting ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
          aria-live="polite"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/95 px-4 py-2 text-sm font-semibold text-ink shadow-lg backdrop-blur-sm">
            <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
            {t("quiz.sending")}
          </div>
        </div>
      ) : null}
    </section>
  );
}
