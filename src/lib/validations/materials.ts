import { z } from "zod";

const emptyDoc = { type: "doc", content: [] as unknown[] };

export const materialVisibilitySchema = z.enum(["STUDENT", "PUBLIC"]);
export const materialStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const materialLocaleInputSchema = z.object({
  locale: z.enum(["id", "en"]),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).optional().default(""),
  body: z.unknown().optional().default(emptyDoc),
});

export const materialTagInputSchema = z.object({
  nameId: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).optional().default(""),
  slug: z.string().trim().max(80).optional(),
});

export const materialUpsertSchema = z
  .object({
    visibility: materialVisibilitySchema,
    status: materialStatusSchema,
    featured: z.boolean().optional().default(false),
    coverObjectKey: z.string().trim().max(512).nullable().optional(),
    locales: z.array(materialLocaleInputSchema).min(1).max(2),
    tags: z.array(materialTagInputSchema).max(5).optional().default([]),
  })
  .superRefine((value, ctx) => {
    const locales = new Set(value.locales.map((l) => l.locale));
    if (!locales.has("id") && !locales.has("en")) {
      ctx.addIssue({
        code: "custom",
        message: "At least one locale (id or en) is required",
        path: ["locales"],
      });
    }
    if (value.featured && value.visibility !== "PUBLIC") {
      ctx.addIssue({
        code: "custom",
        message: "Featured is only valid for PUBLIC news",
        path: ["featured"],
      });
    }
  });

export const materialsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(120).optional().default(""),
  visibility: z
    .enum(["STUDENT", "PUBLIC", "ALL"])
    .optional()
    .default("ALL"),
  status: z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED", "ALL"])
    .optional()
    .default("ALL"),
  tag: z.string().trim().max(80).optional().default(""),
  featured: z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => {
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
      return undefined;
    }),
  locale: z.enum(["id", "en"]).optional().default("id"),
  sortBy: z
    .enum(["publishedAt", "createdAt", "updatedAt", "title"])
    .optional()
    .default("publishedAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const materialIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const materialSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Invalid slug"),
});

export type MaterialUpsertInput = z.infer<typeof materialUpsertSchema>;
export type MaterialsListQuery = z.infer<typeof materialsListQuerySchema>;
