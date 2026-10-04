/**
 * Shared password complexity policy (register, reset, change-password).
 * Keep in sync with Zod schemas in `src/lib/validations/auth.ts`.
 */

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyError =
  | "PASSWORD_MIN"
  | "PASSWORD_MAX"
  | "PASSWORD_UPPER"
  | "PASSWORD_LOWER"
  | "PASSWORD_NUMBER"
  | "PASSWORD_SYMBOL";

export function assertPasswordComplexity(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error("PASSWORD_MIN");
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error("PASSWORD_MAX");
  }
  if (!/[A-Z]/.test(password)) throw new Error("PASSWORD_UPPER");
  if (!/[a-z]/.test(password)) throw new Error("PASSWORD_LOWER");
  if (!/[0-9]/.test(password)) throw new Error("PASSWORD_NUMBER");
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error("PASSWORD_SYMBOL");
}
