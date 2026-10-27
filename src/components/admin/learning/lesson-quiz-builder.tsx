"use client";

import { ArrowDown, ArrowUp, ChevronDown, Eye, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { RichTextField } from "@/components/admin/learning/rich-text-field";
import { PracticeSession } from "@/components/learning/practice-session";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  gradePreview,
  practiceItemFromInput,
  withPracticeShuffle,
} from "@/lib/learning/practice";
import type { PracticeResultView } from "@/lib/learning/practice";
import {
  docFromStored,
  QUESTION_EXPLANATION_MAX,
  QUESTION_PROMPT_MAX,
  visibleLength,
} from "@/lib/learning/rich-text";
import { tipTapToPlainText } from "@/lib/materials/plain-text";
import type { QuestionInput, QuestionType } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type Props = {
  questions: QuestionInput[];
  onChange: (next: QuestionInput[]) => void;
  disabled?: boolean;
  passScore?: number;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  onShuffleQuestionsChange?: (next: boolean) => void;
  onShuffleChoicesChange?: (next: boolean) => void;
};

const TYPES = ["multiple_choice", "short_answer", "flashcard"] as const;

function blank(type: QuestionType): QuestionInput {
  if (type === "multiple_choice") {
    return {
      type,
      promptId: "",
      promptEn: "",
      explanationId: "",
      explanationEn: "",
      options: [
        { labelId: "", labelEn: "", correct: true },
        { labelId: "", labelEn: "", correct: false },
      ],
    };
  }
  if (type === "short_answer") {
    return {
      type,
      promptId: "",
      promptEn: "",
      explanationId: "",
      explanationEn: "",
      acceptedAnswers: [""],
    };
  }
  return {
    type,
    promptId: "",
    promptEn: "",
    answerId: "",
    answerEn: "",
    explanationId: "",
    explanationEn: "",
  };
}

function same(value: string) {
  return { promptId: value, promptEn: value };
}

export function LessonQuizBuilder({
  questions,
  onChange,
  disabled,
  passScore = 80,
  shuffleQuestions = false,
  shuffleChoices = false,
  onShuffleQuestionsChange,
  onShuffleChoicesChange,
}: Props) {
  const t = useTranslations("learningAdmin");
  const student = useTranslations("learningStudent");
  const [openIndex, setOpenIndex] = useState<number | null>(questions.length ? 0 : null);
  const [previewIndexes, setPreviewIndexes] = useState<number[] | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewResult, setPreviewResult] = useState<PracticeResultView | null>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const previewQuestions = (previewIndexes ?? []).map((index) => questions[index]).filter((question): question is QuestionInput => Boolean(question));
  const previewItems = withPracticeShuffle(
    previewQuestions.map((question, index) => practiceItemFromInput(question, index)),
    shuffleQuestions,
    shuffleChoices,
  );

  function update(index: number, patch: Partial<QuestionInput>) {
    onChange(questions.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }

  function add(type: QuestionType) {
    onChange([...questions, blank(type)]);
    setOpenIndex(questions.length);
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    const copy = questions.slice();
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    onChange(copy);
    setOpenIndex(next);
  }

  function openPreview(indexes: number[]) {
    setPreviewResult(null);
    setPreviewKey((key) => key + 1);
    setPreviewIndexes(indexes);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("quiz.title")}</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-charcoal/60">{t("quiz.hint")}</p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <IconTooltip label={t("quiz.previewAll")}>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-10 cursor-pointer rounded-xl"
              disabled={disabled || questions.length === 0}
              aria-label={t("quiz.previewAll")}
              onClick={() => openPreview(questions.map((_, index) => index))}
            >
              <Eye className="size-4" />
            </Button>
          </IconTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={disabled || questions.length >= 30}
              className={cn(buttonVariants(), "h-10 cursor-pointer gap-2 rounded-xl px-3 font-semibold")}
            >
              <Plus className="size-4" aria-hidden />
              {t("quiz.add")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-charcoal/10 bg-[#f7f2ea] p-1.5 text-ink shadow-xl">
              {TYPES.map((type) => (
                <DropdownMenuItem key={type} className="cursor-pointer flex-col items-start gap-0.5 rounded-xl px-3 py-2" onClick={() => add(type)}>
                  <span className="text-sm font-semibold">{t(`quiz.types.${type}`)}</span>
                  <span className="text-xs text-charcoal/60">{t(`quiz.typeHint.${type}`)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border px-3.5 py-3 transition duration-200",
            shuffleQuestions ? "border-brand/35 bg-brand/5" : "border-charcoal/10 bg-[var(--workspace-card)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
            checked={shuffleQuestions}
            disabled={disabled}
            onChange={(event) => onShuffleQuestionsChange?.(event.target.checked)}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{t("quiz.shuffleQuestions")}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-charcoal/55">{t("quiz.shuffleQuestionsHint")}</span>
          </span>
        </label>
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border px-3.5 py-3 transition duration-200",
            shuffleChoices ? "border-brand/35 bg-brand/5" : "border-charcoal/10 bg-[var(--workspace-card)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
            checked={shuffleChoices}
            disabled={disabled}
            onChange={(event) => onShuffleChoicesChange?.(event.target.checked)}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{t("quiz.shuffleChoices")}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-charcoal/55">{t("quiz.shuffleChoicesHint")}</span>
          </span>
        </label>
      </div>

      {questions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-sm text-charcoal/55">
          {t("quiz.empty")}
        </p>
      ) : null}

      <ol className="space-y-2">
        {questions.map((question, index) => {
          const open = openIndex === index;
          const promptCount = visibleLength(question.promptId || question.promptEn);
          const excerpt = tipTapToPlainText(docFromStored(question.promptId || question.promptEn)).trim();
          return (
            <li key={`${question.type}-${index}`} className="rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)]">
              <div className="flex flex-col gap-2 px-2.5 py-2.5 sm:flex-row sm:items-center sm:gap-2 sm:px-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-1 py-1 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold tracking-wide text-brand uppercase">
                      {t(`quiz.types.${question.type}`)}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-sm font-semibold leading-snug text-ink">
                      {excerpt || t("quiz.promptPlaceholder")}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-charcoal/45 transition-transform duration-300",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                <div className="flex h-10 shrink-0 items-center justify-end gap-0.5 self-stretch rounded-xl border border-charcoal/10 bg-[var(--workspace-card)] px-0.5 sm:h-9 sm:self-center">
                  <IconTooltip label={t("quiz.preview")}>
                    <Button type="button" size="icon" variant="ghost" className="size-9 cursor-pointer sm:size-8" disabled={disabled} aria-label={t("quiz.preview")} onClick={() => openPreview([index])}>
                      <Eye className="size-4" />
                    </Button>
                  </IconTooltip>
                  <IconTooltip label={t("quiz.moveUp")}>
                    <Button type="button" size="icon" variant="ghost" className="size-9 cursor-pointer sm:size-8" disabled={disabled || index === 0} aria-label={t("quiz.moveUp")} onClick={() => move(index, -1)}>
                      <ArrowUp className="size-4" />
                    </Button>
                  </IconTooltip>
                  <IconTooltip label={t("quiz.moveDown")}>
                    <Button type="button" size="icon" variant="ghost" className="size-9 cursor-pointer sm:size-8" disabled={disabled || index === questions.length - 1} aria-label={t("quiz.moveDown")} onClick={() => move(index, 1)}>
                      <ArrowDown className="size-4" />
                    </Button>
                  </IconTooltip>
                  <IconTooltip label={t("quiz.remove")}>
                    <Button type="button" size="icon" variant="ghost" className="size-9 cursor-pointer text-destructive sm:size-8" disabled={disabled} aria-label={t("quiz.remove")} onClick={() => setRemoveIndex(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </IconTooltip>
                </div>
              </div>

              {open ? (
                <div className="space-y-4 border-t border-charcoal/10 px-3 py-4 animate-in fade-in-0 slide-in-from-top-1 duration-200 sm:px-4">
                    <div className="space-y-1.5">
                      <Label>
                        {t("quiz.prompt")}
                        <span className="ml-1 text-destructive" aria-hidden>*</span>
                      </Label>
                      <RichTextField
                        full
                        value={question.promptId || question.promptEn}
                        disabled={disabled}
                        max={QUESTION_PROMPT_MAX}
                        placeholder={t("quiz.promptPlaceholder")}
                        counterLabel={t("quiz.chars", { count: promptCount, max: QUESTION_PROMPT_MAX })}
                        onChange={(stored) => update(index, same(stored))}
                      />
                    </div>

                    {question.type === "multiple_choice" ? (
                      <div className="space-y-2">
                        <div>
                          <Label>{t("quiz.options")}</Label>
                          <p className="mt-1 text-[11px] leading-relaxed text-charcoal/55">{t("quiz.optionHint")}</p>
                        </div>
                        <div className="space-y-2" role="radiogroup" aria-label={t("quiz.correct")}>
                          {(question.options ?? []).map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={cn(
                                "flex items-center gap-2 rounded-2xl border px-2 py-2 sm:px-3",
                                option.correct ? "border-brand/35 bg-brand/5" : "border-charcoal/10 bg-[var(--workspace-card)]",
                              )}
                            >
                              <button
                                type="button"
                                role="radio"
                                aria-checked={Boolean(option.correct)}
                                aria-label={t("quiz.markCorrect")}
                                disabled={disabled}
                                className={cn(
                                  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition duration-200 sm:size-8",
                                  option.correct ? "border-brand bg-brand" : "border-charcoal/25",
                                )}
                                onClick={() =>
                                  update(index, {
                                    options: (question.options ?? []).map((item, j) => ({ ...item, correct: j === optionIndex })),
                                  })
                                }
                              >
                                <span className={cn("size-2 rounded-full bg-white transition duration-200", option.correct ? "scale-100" : "scale-0")} />
                              </button>
                              <Input
                                value={option.labelId}
                                disabled={disabled}
                                placeholder={t("quiz.optionPlaceholder")}
                                maxLength={300}
                                className="h-11 min-w-0 flex-1 rounded-xl border-transparent bg-transparent shadow-none"
                                onChange={(event) => {
                                  const label = event.target.value;
                                  update(index, {
                                    options: (question.options ?? []).map((item, j) =>
                                      j === optionIndex ? { ...item, labelId: label, labelEn: label } : item,
                                    ),
                                  });
                                }}
                              />
                              {option.correct ? (
                                <span className="hidden rounded-full bg-brand/10 px-2 py-1 text-[10px] font-bold tracking-wide text-brand uppercase sm:inline-flex">
                                  {t("quiz.answerKeyBadge")}
                                </span>
                              ) : null}
                              <IconTooltip label={t("quiz.remove")}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 cursor-pointer text-destructive"
                                  disabled={disabled || (question.options ?? []).length <= 2}
                                  aria-label={t("quiz.remove")}
                                  onClick={() => update(index, { options: (question.options ?? []).filter((_, j) => j !== optionIndex) })}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </IconTooltip>
                            </div>
                          ))}
                        </div>
                        <Button type="button" variant="outline" className="h-9 cursor-pointer rounded-xl" disabled={disabled || (question.options ?? []).length >= 6} onClick={() => update(index, { options: [...(question.options ?? []), { labelId: "", labelEn: "", correct: false }] })}>
                          {t("quiz.addOption")}
                        </Button>
                      </div>
                    ) : null}

                    {question.type === "short_answer" ? (
                      <div className="space-y-2 rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-3 sm:p-4">
                        <div>
                          <Label>{t("quiz.answerKeys")}</Label>
                          <p className="mt-1 text-[11px] leading-relaxed text-charcoal/55">{t("quiz.acceptedHint")}</p>
                        </div>
                        {(question.acceptedAnswers ?? [""]).map((answer, answerIndex) => (
                          <div key={answerIndex} className="flex items-center gap-2">
                            <span className="w-6 shrink-0 text-center text-xs font-bold text-charcoal/40">{answerIndex + 1}</span>
                            <Input
                              value={answer}
                              disabled={disabled}
                              placeholder={t("quiz.acceptedPlaceholder")}
                              maxLength={200}
                              className="h-11 flex-1 rounded-xl font-jp"
                              onChange={(event) =>
                                update(index, {
                                  acceptedAnswers: (question.acceptedAnswers ?? [""]).map((item, j) => (j === answerIndex ? event.target.value : item)),
                                })
                              }
                            />
                            <IconTooltip label={t("quiz.remove")}>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 cursor-pointer text-destructive"
                                disabled={disabled || (question.acceptedAnswers ?? []).length <= 1}
                                aria-label={t("quiz.remove")}
                                onClick={() => update(index, { acceptedAnswers: (question.acceptedAnswers ?? []).filter((_, j) => j !== answerIndex) })}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </IconTooltip>
                          </div>
                        ))}
                        <Button type="button" variant="outline" className="h-9 cursor-pointer rounded-xl" disabled={disabled || (question.acceptedAnswers ?? []).length >= 12} onClick={() => update(index, { acceptedAnswers: [...(question.acceptedAnswers ?? []), ""] })}>
                          {t("quiz.addAnswer")}
                        </Button>
                      </div>
                    ) : null}

                    {question.type === "flashcard" ? (
                      <div className="space-y-1.5">
                        <Label>{t("quiz.back")}</Label>
                        <RichTextField
                          full
                          value={question.answerId || question.answerEn || ""}
                          disabled={disabled}
                          max={QUESTION_PROMPT_MAX}
                          placeholder={t("quiz.backPlaceholder")}
                          counterLabel={t("quiz.chars", { count: visibleLength(question.answerId || question.answerEn || ""), max: QUESTION_PROMPT_MAX })}
                          onChange={(stored) => update(index, { answerId: stored, answerEn: stored })}
                        />
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      <Label>{t("quiz.explanation")}</Label>
                      <p className="text-[11px] leading-relaxed text-charcoal/55">{t("quiz.explanationHint")}</p>
                      <RichTextField
                        full
                        value={question.explanationId || question.explanationEn || ""}
                        disabled={disabled}
                        max={QUESTION_EXPLANATION_MAX}
                        placeholder={t("quiz.explanationPlaceholder")}
                        counterLabel={t("quiz.chars", { count: visibleLength(question.explanationId || question.explanationEn || ""), max: QUESTION_EXPLANATION_MAX })}
                        onChange={(stored) => update(index, { explanationId: stored, explanationEn: stored })}
                      />
                    </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Dialog open={previewIndexes != null} onOpenChange={(open) => { if (!open) setPreviewIndexes(null); }}>
        <DialogContent className="isolate max-h-[88vh] overflow-y-auto rounded-2xl border border-charcoal/15 bg-[#f4efe8] p-5 text-ink shadow-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("quiz.previewTitle")}</DialogTitle>
            <DialogDescription>{t("quiz.previewHint")}</DialogDescription>
          </DialogHeader>
          {previewQuestions.length > 0 ? (
            <PracticeSession
              key={previewKey}
              questions={previewItems}
              result={previewResult}
              submitLabel={student("quiz.check")}
              onSubmit={(answers) => {
                const graded = gradePreview(previewQuestions, answers, passScore);
                if (graded.ok) setPreviewResult(graded.result);
              }}
              onRetry={() => {
                setPreviewResult(null);
                setPreviewKey((key) => key + 1);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={removeIndex != null}
        onOpenChange={(open) => { if (!open) setRemoveIndex(null); }}
        title={t("quiz.removeTitle")}
        description={t("quiz.removeBody")}
        confirmLabel={t("quiz.remove")}
        cancelLabel={t("actions.cancel")}
        tone="danger"
        onConfirm={() => {
          if (removeIndex == null) return;
          const next = questions.filter((_, i) => i !== removeIndex);
          onChange(next);
          setOpenIndex((current) => {
            if (current == null) return current;
            if (current === removeIndex) return next.length ? Math.min(removeIndex, next.length - 1) : null;
            return current > removeIndex ? current - 1 : current;
          });
          setRemoveIndex(null);
        }}
      />
    </div>
  );
}
