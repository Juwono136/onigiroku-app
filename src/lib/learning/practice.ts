import type { QuestionInput, QuestionType } from "@/lib/learning/types";

export type PracticeItem = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: { id: string; label: string }[];
  cardBack?: string;
};

export type PracticeAnswer = {
  id: string;
  selectedOptionId: string;
  textAnswer: string;
  knew: boolean | null;
};

export type PracticeReviewView = {
  id: string;
  correct: boolean;
  explanation: string;
  answer: string;
  correctOptionId: string;
  correctOptionLabel: string;
};

export type PracticeResultView = {
  score: number;
  passed: boolean;
  passScore: number;
  reviews: PracticeReviewView[];
};

/**
 * Same folding as the Go grader:
 * NFKC, trim, lower case, collapsed spaces, katakana → hiragana.
 */
export function normalizeAnswerText(raw: string): string {
  const folded = raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  let out = "";
  for (const char of folded) {
    const code = char.codePointAt(0) ?? 0;
    // Katakana letter range ァ–ヶ → hiragana
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCodePoint(code - 0x60);
      continue;
    }
    out += char;
  }
  return out;
}

export function practiceItemFromInput(question: QuestionInput, index: number): PracticeItem {
  return {
    id: `preview-${index}`,
    type: question.type,
    prompt: question.promptId || question.promptEn,
    options: (question.options ?? []).map((option, optionIndex) => ({
      id: `preview-${index}-opt-${optionIndex}`,
      label: option.labelId || option.labelEn,
    })),
    cardBack: question.type === "flashcard" ? question.answerId || question.answerEn || "" : undefined,
  };
}

/** Fisher–Yates with crypto randomness when available. */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function randomIndex(max: number): number {
  if (max <= 1) return 0;
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! % max;
  }
  return Math.floor(Math.random() * max);
}

/** Copy + optionally shuffle question order and multiple-choice options. */
export function withPracticeShuffle(
  items: PracticeItem[],
  shuffleQuestions: boolean,
  shuffleChoices: boolean,
): PracticeItem[] {
  const next = items.map((item) => ({
    ...item,
    options:
      shuffleChoices && item.type === "multiple_choice" && item.options.length > 1
        ? shuffleInPlace([...item.options])
        : [...item.options],
  }));
  if (shuffleQuestions && next.length > 1) {
    shuffleInPlace(next);
  }
  return next;
}

export function gradePreview(
  questions: QuestionInput[],
  answers: PracticeAnswer[],
  passScore: number,
): { ok: true; result: PracticeResultView } | { ok: false } {
  if (answers.length !== questions.length) return { ok: false };
  const byId = new Map(answers.map((answer) => [answer.id, answer]));
  let correctCount = 0;
  const reviews: PracticeReviewView[] = [];

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]!;
    const item = practiceItemFromInput(question, index);
    const answer = byId.get(item.id);
    if (!answer) return { ok: false };

    let correct = false;
    let correctOptionId = "";
    let correctOptionLabel = "";
    let answerText = "";

    if (question.type === "multiple_choice") {
      const options = question.options ?? [];
      const selected = options.findIndex((_, optionIndex) => item.options[optionIndex]?.id === answer.selectedOptionId);
      if (selected < 0 || !answer.selectedOptionId) return { ok: false };
      correct = Boolean(options[selected]?.correct);
      const correctIndex = options.findIndex((option) => option.correct);
      correctOptionId = correctIndex >= 0 ? item.options[correctIndex]?.id ?? "" : "";
      correctOptionLabel = correctIndex >= 0 ? item.options[correctIndex]?.label ?? "" : "";
    } else if (question.type === "short_answer") {
      const got = normalizeAnswerText(answer.textAnswer);
      if (!got) return { ok: false };
      const accepted = (question.acceptedAnswers ?? []).map((value) => value.trim()).filter(Boolean);
      correct = accepted.some((value) => normalizeAnswerText(value) === got);
      answerText = accepted.join("\n");
    } else {
      if (answer.knew == null) return { ok: false };
      correct = answer.knew;
      answerText = question.answerId || question.answerEn || "";
    }

    if (correct) correctCount += 1;
    reviews.push({
      id: item.id,
      correct,
      explanation: question.explanationId || question.explanationEn || "",
      answer: answerText,
      correctOptionId,
      correctOptionLabel,
    });
  }

  const safePass = passScore < 50 ? 80 : passScore;
  const score = Math.round((correctCount * 100) / questions.length);
  return {
    ok: true,
    result: { score, passed: score >= safePass, passScore: safePass, reviews },
  };
}
