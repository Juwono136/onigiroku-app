import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "NAME_MIN")
  .max(80, "NAME_MAX")
  .regex(/^[\p{L}\p{M}\s'.-]+$/u, "NAME_INVALID");

const passwordSchema = z
  .string()
  .min(6, "PASSWORD_MIN")
  .max(128, "PASSWORD_MAX")
  .regex(/[A-Z]/, "PASSWORD_UPPER")
  .regex(/[a-z]/, "PASSWORD_LOWER")
  .regex(/[0-9]/, "PASSWORD_NUMBER")
  .regex(/[^A-Za-z0-9]/, "PASSWORD_SYMBOL");

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "PASSWORD_REQUIRED").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "CONFIRM_REQUIRED"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "PASSWORD_SAME",
    path: ["newPassword"],
  });

export const loginHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
