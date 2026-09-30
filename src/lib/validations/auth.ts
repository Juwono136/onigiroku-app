import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "NAME_MIN")
  .max(80, "NAME_MAX")
  .regex(/^[\p{L}\p{M}\s'.-]+$/u, "NAME_INVALID");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("EMAIL_INVALID")
  .max(254, "EMAIL_MAX");

/**
 * Password policy (email/password sign-up & reset):
 * min 6 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 symbol.
 */
const passwordSchema = z
  .string()
  .min(6, "PASSWORD_MIN")
  .max(128, "PASSWORD_MAX")
  .regex(/[A-Z]/, "PASSWORD_UPPER")
  .regex(/[a-z]/, "PASSWORD_LOWER")
  .regex(/[0-9]/, "PASSWORD_NUMBER")
  .regex(/[^A-Za-z0-9]/, "PASSWORD_SYMBOL");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "PASSWORD_REQUIRED").max(128),
});

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "CONFIRM_REQUIRED"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "CONFIRM_REQUIRED"),
    token: z.string().min(1, "TOKEN_REQUIRED"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
