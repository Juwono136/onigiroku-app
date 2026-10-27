"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { RichTextView } from "@/components/learning/rich-text-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PracticeAnswer, PracticeItem, PracticeResultView } from "@/lib/learning/practice";
import { normalizeAnswerText } from "@/lib/learning/practice";
import { cn } from "@/lib/utils";

type Props = {
  questions: PracticeItem[];
  result: PracticeResultView | null;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (answers: PracticeAnswer[]) => void;
  onRetry?: () => void;
  nextSlot?: ReactNode;
};

type Draft = {
  selectedOptionId: string;
  textAnswer: string;
  knew: boolean | null;
  revealed: boolean;
};

const emptyDraft = (): Draft => ({
  selectedOptionId: "",
  textAnswer: "",
  knew: null,
  revealed: false,
});

export function PracticeSession({
  questions,
  result,
  submitting = false,
  submitLabel,
  onSubmit,
  onRetry,
  nextSlot,
}: Props) {
  const t = useTranslations("learningStudent");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [notice, setNotice] = useState("");

  const reviews = useMemo(() => new Map((result?.reviews ?? []).map((review) => [review.id, review])), [result]);
  const answered = questions.filter((question) => isAnswered(question, drafts[question.id] ?? emptyDraft())).length;

  function patch(id: string, next: Partial<Draft>) {
    setNotice("");
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyDraft()), ...next } }));
  }

  function submit() {
    const missing = questions.some((question) => !isAnswered(question, drafts[question.id] ?? emptyDraft()));
    if (missing) {
      setNotice(t("quiz.missing"));
      return;
    }
    onSubmit(
      questions.map((question) => {
        const draft = drafts[question.id] ?? emptyDraft();
        return {
          id: question.id,
          selectedOptionId: draft.selectedOptionId,
          textAnswer: draft.textAnswer,
          knew: draft.knew,
        };
      }),
    );
  }

  return (
    <div className="space-y-4">
      {result ? (
        <div className="flex items-center gap-4 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] px-4 py-4 shadow-sm">
          <div
            className="grid size-16 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--brand) ${result.score * 3.6}deg, rgba(24,24,27,0.1) 0deg)` }}
            aria-hidden
          >
            <div className="grid size-12 place-items-center rounded-full bg-[var(--workspace-card,#f4efe8)] text-sm font-bold text-ink">
              {result.score}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{result.passed ? t("quiz.resultPass") : t("quiz.resultFail")}</p>
            <p className="mt-1 text-sm text-charcoal/70">{t("quiz.score", { score: result.score, pass: result.passScore })}</p>
          </div>
        </div>
      ) : null}

      <ol className="space-y-4 pb-2">
        {questions.map((question, index) => {
          const draft = drafts[question.id] ?? emptyDraft();
          const review = reviews.get(question.id);
          const flipped = draft.revealed || Boolean(review);
          return (
            <li
              key={question.id}
              className="rounded-[1.25rem] border border-charcoal/10 bg-[var(--workspace-surface,#efe8de)] p-3.5 shadow-sm sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand uppercase">
                  {t("quiz.questionOf", { index: index + 1, total: questions.length })}
                </span>
                <span className="text-[11px] font-semibold text-charcoal/50">
                  {t(`quiz.types.${question.type}`)}
                </span>
              </div>

              {question.type === "flashcard" ? null : (
                <RichTextView value={question.prompt} className="font-jp text-base text-ink" />
              )}

              {question.type === "multiple_choice" ? (
                <div className="mt-4 space-y-2" role="radiogroup" aria-label={t("quiz.choices")}>
                  {question.options.map((option) => {
                    const selected = draft.selectedOptionId === option.id;
                    const isCorrect = Boolean(review && review.correctOptionId === option.id);
                    const isWrongPick = Boolean(review && selected && !review.correct);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={Boolean(result) || submitting}
                        onClick={() => patch(question.id, { selectedOptionId: option.id })}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition duration-200",
                          !review && selected && "border-brand bg-brand/8 shadow-sm",
                          !review && !selected && "border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] hover:border-brand/35",
                          isCorrect && "border-success/55 bg-success/10",
                          isWrongPick && "border-destructive/50 bg-destructive/10",
                          review && !isCorrect && !isWrongPick && "border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] opacity-80",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition duration-200",
                            !review && selected && "border-brand bg-brand",
                            !review && !selected && "border-charcoal/25 bg-transparent",
                            isCorrect && "border-success bg-success",
                            isWrongPick && "border-destructive bg-destructive",
                            review && !isCorrect && !isWrongPick && "border-charcoal/25 bg-transparent",
                          )}
                        >
                          <span
                            className={cn(
                              "size-2 rounded-full bg-white transition duration-200",
                              (!review && selected) || isCorrect || isWrongPick
                                ? "scale-100"
                                : "scale-0",
                            )}
                          />
                        </span>
                        <span className="min-w-0 flex-1 font-medium text-ink">
                          {option.label || t("quiz.emptyChoice")}
                        </span>
                        {isCorrect ? (
                          <span className="text-[11px] font-bold tracking-wide text-success uppercase">
                            {t("quiz.correctChoice")}
                          </span>
                        ) : null}
                        {isWrongPick ? (
                          <span className="text-[11px] font-bold tracking-wide text-destructive uppercase">
                            {t("quiz.incorrect")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {question.type === "short_answer" ? (
                <div className="mt-4 space-y-2">
                  <Input
                    value={draft.textAnswer}
                    disabled={Boolean(result) || submitting}
                    placeholder={t("quiz.shortPlaceholder")}
                    maxLength={200}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    lang="ja"
                    className="h-12 rounded-2xl border-charcoal/15 bg-[var(--workspace-card,#f4efe8)] font-jp text-base"
                    onChange={(event) => patch(question.id, { textAnswer: event.target.value })}
                  />
                  {!result ? (
                    <p className="text-[11px] leading-relaxed text-charcoal/55">{t("quiz.shortHint")}</p>
                  ) : null}
                </div>
              ) : null}

              {question.type === "flashcard" ? (
                <div className="mt-1 space-y-3 sm:space-y-4">
                  {/* Grid-stacked faces so height follows content (no clipped absolute card). */}
                  <div className="mx-auto w-full max-w-lg [perspective:1400px]">
                    <button
                      type="button"
                      disabled={Boolean(result)}
                      aria-pressed={flipped}
                      onClick={() => {
                        if (!result) patch(question.id, { revealed: !draft.revealed });
                      }}
                      className={cn(
                        "grid w-full cursor-pointer text-left transition-transform duration-500 [transform-style:preserve-3d]",
                        flipped && "[transform:rotateY(180deg)]",
                        result && "cursor-default",
                      )}
                    >
                      <div
                        className={cn(
                          "col-start-1 row-start-1 flex min-h-[11.5rem] flex-col gap-3 rounded-[1.25rem] border border-brand/20 bg-gradient-to-br from-[#fff8f0] via-[#f4efe8] to-[#efe4d8] p-4 shadow-[0_18px_40px_-28px_rgba(24,24,27,0.45)] [backface-visibility:hidden] sm:min-h-[13rem] sm:rounded-[1.4rem] sm:p-5",
                          flipped && "pointer-events-none",
                        )}
                      >
                        <p className="text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
                          {t("quiz.cardFront")}
                        </p>
                        <div className="flex flex-1 items-center">
                          <RichTextView
                            value={question.prompt}
                            className="font-jp w-full text-base leading-relaxed font-semibold break-words text-ink sm:text-lg"
                          />
                        </div>
                        <p className="text-xs font-semibold text-charcoal/55">
                          {t("quiz.tapFlip")}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "col-start-1 row-start-1 flex min-h-[11.5rem] flex-col gap-3 rounded-[1.25rem] border border-charcoal/10 bg-gradient-to-br from-[#1f1a17] via-[#2a2320] to-[#3a2e28] p-4 text-white shadow-[0_18px_40px_-28px_rgba(24,24,27,0.65)] [transform:rotateY(180deg)] [backface-visibility:hidden] sm:min-h-[13rem] sm:rounded-[1.4rem] sm:p-5",
                          !flipped && "pointer-events-none",
                        )}
                      >
                        <p className="text-[11px] font-bold tracking-[0.14em] text-white/55 uppercase">
                          {t("quiz.cardBack")}
                        </p>
                        <div className="flex flex-1 items-center">
                          {review?.answer || question.cardBack ? (
                            <RichTextView
                              value={review?.answer || question.cardBack || ""}
                              className="font-jp w-full text-base leading-relaxed font-semibold break-words text-white sm:text-lg [&_*]:text-white"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed text-white/70">
                              {t("quiz.markHint")}
                            </p>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-white/50">
                          {t("quiz.tapFlipBack")}
                        </p>
                      </div>
                    </button>
                  </div>
                  {flipped ? (
                    <div className="mx-auto flex w-full max-w-lg flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        disabled={Boolean(result) || submitting}
                        className={cn(
                          "h-11 w-full cursor-pointer rounded-2xl font-semibold sm:flex-1",
                          draft.knew === true &&
                            "ring-2 ring-brand ring-offset-2 ring-offset-[var(--workspace-surface,#efe8de)]",
                        )}
                        onClick={() =>
                          patch(question.id, { knew: true, revealed: true })
                        }
                      >
                        <Check className="size-4" aria-hidden />
                        {t("quiz.knew")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(result) || submitting}
                        className={cn(
                          "h-11 w-full cursor-pointer rounded-2xl font-semibold sm:flex-1",
                          draft.knew === false &&
                            "border-destructive/40 ring-2 ring-destructive/30",
                        )}
                        onClick={() =>
                          patch(question.id, { knew: false, revealed: true })
                        }
                      >
                        <X className="size-4" aria-hidden />
                        {t("quiz.learning")}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-center text-xs leading-relaxed text-charcoal/55">
                      {t("quiz.flipFirst")}
                    </p>
                  )}
                </div>
              ) : null}

              {review ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] px-4 py-3">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      review.correct ? "text-success" : "text-destructive",
                    )}
                  >
                    {review.correct ? t("quiz.correct") : t("quiz.incorrect")}
                  </p>
                  {question.type === "multiple_choice" && !review.correct && review.correctOptionLabel ? (
                    <p className="text-sm text-ink">
                      <span className="font-semibold text-charcoal/60">{t("quiz.correctAnswerLabel")}</span>{" "}
                      <span className="font-semibold text-success">{review.correctOptionLabel}</span>
                    </p>
                  ) : null}
                  {question.type === "short_answer" && review.answer ? (
                    <div>
                      <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">{t("quiz.acceptedShow")}</p>
                      <ul className="mt-1 space-y-1">
                        {review.answer.split("\n").filter(Boolean).map((line) => (
                          <li key={line} className="rounded-xl bg-[var(--workspace-surface,#efe8de)] px-3 py-1.5 font-jp text-sm text-ink">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {review.explanation ? (
                    <div className="border-t border-charcoal/10 pt-3">
                      <p className="text-[11px] font-bold tracking-wide text-charcoal/45 uppercase">{t("quiz.explanation")}</p>
                      <RichTextView value={review.explanation} className="mt-1 text-sm" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {result ? (
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {onRetry ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full cursor-pointer rounded-2xl px-4 font-semibold sm:w-auto"
                onClick={onRetry}
              >
                <RotateCcw className="size-4" aria-hidden />
                {t("quiz.tryAgain")}
              </Button>
            ) : null}
          </div>
          {nextSlot ? <div className="w-full shrink-0 sm:w-auto">{nextSlot}</div> : null}
        </div>
      ) : (
        <div
          className={cn(
            "mt-2 flex w-full flex-col gap-3 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f4efe8)] p-3.5 shadow-sm",
            "sm:sticky sm:bottom-4 sm:z-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:bg-[var(--workspace-card,#f4efe8)]/95 sm:p-4 sm:shadow-[0_16px_40px_-24px_rgba(24,24,27,0.55)] sm:backdrop-blur-md",
          )}
        >
          <p
            className={cn(
              "min-w-0 text-sm leading-snug",
              notice ? "font-semibold text-destructive" : "text-charcoal/65",
            )}
          >
            {notice ||
              t("quiz.answered", { done: answered, total: questions.length })}
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {nextSlot ? <div className="w-full sm:w-auto">{nextSlot}</div> : null}
            <Button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="h-11 w-full shrink-0 cursor-pointer rounded-2xl px-5 font-semibold sm:w-auto"
            >
              {submitting ? t("quiz.sending") : submitLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function isAnswered(question: PracticeItem, draft: Draft) {
  if (question.type === "multiple_choice") return Boolean(draft.selectedOptionId);
  if (question.type === "short_answer") return Boolean(normalizeAnswerText(draft.textAnswer));
  return draft.knew != null;
}
