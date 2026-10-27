"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PracticeSession } from "@/components/learning/practice-session";
import { Link } from "@/i18n/routing";
import type { PracticeAnswer, PracticeItem, PracticeResultView } from "@/lib/learning/practice";
import { withPracticeShuffle } from "@/lib/learning/practice";
import type { QuestionPublic, QuizSubmitResult } from "@/lib/learning/types";

type Props = {
  slug: string;
  questions: QuestionPublic[];
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  completed: boolean;
  lessonCount: number;
  completedCount: number;
  nextSlug: string | null;
  nextLocked: boolean;
};

export function LessonPractice({
  slug,
  questions,
  shuffleQuestions = false,
  shuffleChoices = false,
  completed,
  lessonCount,
  completedCount,
  nextSlug,
  nextLocked,
}: Props) {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const [percent, setPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const sent = useRef(0);

  const pct = lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0;

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
    // Server already shuffled for the first paint. Retry reshuffles client-side.
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
      toast.success(payload.data.passed ? t("quiz.passed") : t("quiz.retry"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-2xl border border-charcoal/10 bg-white px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-charcoal/60">
          <span>{t("pathProgress")}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-charcoal/10">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-[1.25rem] border border-charcoal/10 bg-white p-5">
          <p className="font-semibold text-ink">{completed ? t("lesson.done") : t("lesson.opened")}</p>
          {nextSlug && !nextLocked ? (
            <Link href={`/dashboard/materials/${nextSlug}`} className="mt-3 inline-flex text-sm font-semibold text-brand">{t("lesson.next")}</Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-4 shadow-sm sm:p-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">{t("quiz.eyebrow")}</p>
            <h2 className="mt-1 text-xl font-bold text-ink">{t("quiz.title")}</h2>
            <p className="mt-1 text-sm text-charcoal/65">{t("quiz.subtitle")}</p>
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
            onRetry={
              result && !result.passed
                ? () => {
                    setResult(null);
                    setSessionKey((key) => key + 1);
                  }
                : undefined
            }
            nextSlot={result?.passed && result.nextSlug ? (
              <Link href={`/dashboard/materials/${result.nextSlug}`} className="inline-flex h-11 items-center text-sm font-semibold text-brand">{t("lesson.next")}</Link>
            ) : null}
          />
        </div>
      )}
    </section>
  );
}
