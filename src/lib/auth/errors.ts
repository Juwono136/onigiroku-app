/**
 * Map Better Auth / Zod error codes to translation keys under `auth.errors.*`.
 */
export function mapAuthError(error: unknown): string {
  if (!error) return "GENERIC";

  if (typeof error === "string") {
    return normalizeCode(error);
  }

  if (error instanceof Error) {
    return normalizeCode(error.message);
  }

  if (typeof error === "object" && error !== null) {
    const record = error as {
      message?: string;
      code?: string;
      status?: number;
      statusText?: string;
    };
    if (record.code) return normalizeCode(record.code);
    if (record.message) return normalizeCode(record.message);
  }

  return "GENERIC";
}

function normalizeCode(raw: string): string {
  const value = raw.trim();
  if (!value) return "GENERIC";

  if (value.startsWith("ACCOUNT_LOCKED")) return "ACCOUNT_LOCKED";

  const upper = value
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_:]/g, "")
    .toUpperCase();

  const known = new Set([
    "INVALID_EMAIL_OR_PASSWORD",
    "INVALID_PASSWORD",
    "USER_NOT_FOUND",
    "USER_ALREADY_EXISTS",
    "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    "EMAIL_NOT_VERIFIED",
    "EMAIL_ALREADY_VERIFIED",
    "SELF_REGISTRATION_DISABLED",
    "ACCOUNT_LOCKED",
    "TOO_MANY_REQUESTS",
    "RATE_LIMIT",
    "INVALID_TOKEN",
    "TOKEN_EXPIRED",
    "PASSWORD_TOO_SHORT",
    "PASSWORD_TOO_LONG",
    "PASSWORD_COMPROMISED",
    "SOCIAL_ACCOUNT_ALREADY_LINKED",
    "FAILED_TO_CREATE_USER",
    "FAILED_TO_CREATE_SESSION",
    "CREDENTIAL_ACCOUNT_NOT_FOUND",
    "USE_GOOGLE_OR_RESET_PASSWORD",
    "ACCOUNT_NOT_LINKED",
    "UNABLE_TO_LINK_ACCOUNT",
    "GENERIC",
  ]);

  if (known.has(upper)) {
    if (upper === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return "USER_ALREADY_EXISTS";
    }
    return upper;
  }

  // Better Auth often returns human sentences / oauth query codes.
  const lower = value.toLowerCase();
  if (lower.includes("use_google_or_reset_password")) {
    return "USE_GOOGLE_OR_RESET_PASSWORD";
  }
  if (
    lower.includes("account_not_linked") ||
    lower.includes("account not linked")
  ) {
    return "ACCOUNT_NOT_LINKED";
  }
  if (lower.includes("unable_to_link") || lower.includes("unable to link")) {
    return "UNABLE_TO_LINK_ACCOUNT";
  }
  if (lower.includes("invalid email or password") || lower.includes("invalid password")) {
    return "INVALID_EMAIL_OR_PASSWORD";
  }
  if (lower.includes("not verified") || lower.includes("email not verified")) {
    return "EMAIL_NOT_VERIFIED";
  }
  if (lower.includes("already exists") || lower.includes("user already")) {
    return "USER_ALREADY_EXISTS";
  }
  if (lower.includes("too many") || lower.includes("rate limit")) {
    return "TOO_MANY_REQUESTS";
  }
  if (lower.includes("invalid token") || lower.includes("token")) {
    return "INVALID_TOKEN";
  }
  if (lower.includes("locked")) {
    return "ACCOUNT_LOCKED";
  }

  return "GENERIC";
}
