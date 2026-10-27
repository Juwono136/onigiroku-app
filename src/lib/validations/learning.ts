import { z } from "zod";

import { tipTapToPlainText } from "@/lib/materials/plain-text";

function visibleLength(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return Array.from(trimmed).length;
  try {
    return Array.from(tipTapToPlainText(JSON.parse(trimmed) as unknown)).length;
  } catch {
    return Array.from(trimmed).length;
  }
}

const planKey = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i, "Invalid plan key");

const categoryTagInputSchema = z.object({
  nameId: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).optional().default(""),
  slug: z.string().trim().max(80).optional(),
});

export const categoryUpsertSchema = z
  .object({
    nameId: z.string().trim().max(120).optional().default(""),
    nameEn: z.string().trim().max(120).optional().default(""),
    descriptionId: z.string().trim().max(20000).optional().default(""),
    descriptionEn: z.string().trim().max(20000).optional().default(""),
    coverObjectKey: z.string().trim().max(512).nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    planKey: planKey.optional().default("free"),
    tags: z.array(categoryTagInputSchema).max(5).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.nameId && !value.nameEn) {
      ctx.addIssue({ code: "custom", message: "Category name is required", path: ["nameId"] });
    }
    if (visibleLength(value.descriptionId) > 1000 || visibleLength(value.descriptionEn) > 1000) {
      ctx.addIssue({ code: "custom", message: "Description is too long", path: ["descriptionId"] });
    }
  });

export const lessonOrderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export const lessonBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

const optionSchema = z.object({
  labelId: z.string().trim().min(1).max(300),
  labelEn: z.string().trim().max(300).optional().default(""),
  correct: z.boolean().optional().default(false),
});

export const questionInputSchema = z
  .object({
    type: z.enum(["multiple_choice", "short_answer", "flashcard"]),
    promptId: z.string().trim().max(20000).optional().default(""),
    promptEn: z.string().trim().max(20000).optional().default(""),
    explanationId: z.string().trim().max(20000).optional().default(""),
    explanationEn: z.string().trim().max(20000).optional().default(""),
    acceptedAnswers: z.array(z.string().trim().min(1).max(200)).max(12).optional().default([]),
    answerId: z.string().trim().max(20000).optional().default(""),
    answerEn: z.string().trim().max(20000).optional().default(""),
    options: z.array(optionSchema).max(6).optional().default([]),
  })
  .superRefine((value, ctx) => {
    const prompt = value.promptId || value.promptEn;
    if (visibleLength(prompt) < 1) {
      ctx.addIssue({ code: "custom", message: "Question prompt is required", path: ["promptId"] });
    }
    if (visibleLength(value.promptId) > 800 || visibleLength(value.promptEn) > 800) {
      ctx.addIssue({ code: "custom", message: "Question prompt is too long", path: ["promptId"] });
    }
    if (visibleLength(value.explanationId ?? "") > 2000 || visibleLength(value.explanationEn ?? "") > 2000) {
      ctx.addIssue({ code: "custom", message: "Explanation is too long", path: ["explanationId"] });
    }
    if (value.type === "multiple_choice") {
      if (value.options.length < 2) {
        ctx.addIssue({ code: "custom", message: "Need at least 2 options", path: ["options"] });
      }
      const correct = value.options.filter((o) => o.correct).length;
      if (correct !== 1) {
        ctx.addIssue({ code: "custom", message: "Choose exactly one correct option", path: ["options"] });
      }
    }
    if (value.type === "short_answer" && value.acceptedAnswers.length < 1) {
      ctx.addIssue({ code: "custom", message: "Add an accepted answer", path: ["acceptedAnswers"] });
    }
    if (value.type === "flashcard" && !value.answerId.trim() && !value.answerEn.trim()) {
      ctx.addIssue({ code: "custom", message: "Flashcard back is required", path: ["answerId"] });
    }
  });

export const progressBodySchema = z.object({
  readingPercent: z.coerce.number().int().min(0).max(100),
});

export const quizSubmitSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid().optional().or(z.literal("")),
        textAnswer: z.string().trim().max(500).optional().default(""),
        knew: z.boolean().nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
});
