import { z } from "zod";

import { visibleLength } from "@/lib/learning/rich-text";
import {
  BENEFIT_TEXT_MAX,
  BENEFITS_MAX,
  PACKAGE_DESCRIPTION_MAX,
  PACKAGE_DESCRIPTION_STORED_MAX,
} from "@/lib/packages/benefits";

const entitlementSchema = z.object({
  featureType: z
    .enum(["learning_path", "quiz", "exam", "private_class", "practice"])
    .default("learning_path"),
  targetId: z.string().uuid().nullable().optional().default(null),
});

const benefitSchema = z
  .object({
    textId: z.string().trim().max(BENEFIT_TEXT_MAX).optional().default(""),
    textEn: z.string().trim().max(BENEFIT_TEXT_MAX).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.textId && !value.textEn) {
      ctx.addIssue({
        code: "custom",
        message: "Benefit text is required",
        path: ["textId"],
      });
    }
  });

export const packageUpsertSchema = z
  .object({
    nameId: z.string().trim().max(120).optional().default(""),
    nameEn: z.string().trim().max(120).optional().default(""),
    // May be TipTap JSON: stored length is generous, visible length is capped below.
    descriptionId: z
      .string()
      .trim()
      .max(PACKAGE_DESCRIPTION_STORED_MAX)
      .optional()
      .default(""),
    descriptionEn: z
      .string()
      .trim()
      .max(PACKAGE_DESCRIPTION_STORED_MAX)
      .optional()
      .default(""),
    benefits: z.array(benefitSchema).max(BENEFITS_MAX).optional().default([]),
    priceIdr: z.coerce.number().int().min(0).max(100_000_000_000),
    // Fractional discounts allowed (e.g. 0.25). Coerce then round to 2 dp.
    discountPercent: z.preprocess(
      (raw) => {
        if (raw === null || raw === undefined || raw === "") return 0;
        if (typeof raw === "string") {
          const n = Number.parseFloat(raw.trim().replace(",", "."));
          return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
        }
        if (typeof raw === "number" && Number.isFinite(raw)) {
          return Math.round(raw * 100) / 100;
        }
        return 0;
      },
      z.number().min(0).max(100).optional().default(0),
    ),
    discountStartsAt: z.string().trim().nullable().optional(),
    discountEndsAt: z.string().trim().nullable().optional(),
    accessDurationDays: z.coerce.number().int().min(1).max(36500).nullable().optional(),
    coverObjectKey: z.string().trim().max(512).nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    entitlements: z.array(entitlementSchema).max(100).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.nameId && !value.nameEn) {
      ctx.addIssue({
        code: "custom",
        message: "Package name is required",
        path: ["nameId"],
      });
    }
    if (visibleLength(value.descriptionId) > PACKAGE_DESCRIPTION_MAX) {
      ctx.addIssue({
        code: "custom",
        message: "Description is too long",
        path: ["descriptionId"],
      });
    }
    if (visibleLength(value.descriptionEn) > PACKAGE_DESCRIPTION_MAX) {
      ctx.addIssue({
        code: "custom",
        message: "Description is too long",
        path: ["descriptionEn"],
      });
    }
    if (value.discountPercent > 0) {
      if (!value.discountStartsAt || !value.discountEndsAt) {
        ctx.addIssue({
          code: "custom",
          message: "Discount requires a start and end date",
          path: ["discountStartsAt"],
        });
      } else if (value.discountStartsAt > value.discountEndsAt) {
        ctx.addIssue({
          code: "custom",
          message: "Discount end must be after start",
          path: ["discountEndsAt"],
        });
      }
    }
  });

export const checkoutBodySchema = z.object({
  packageSlug: z.string().trim().min(1).max(120),
});
