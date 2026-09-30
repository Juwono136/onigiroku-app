/**
 * Shared helpers for auth UI pages (server).
 */
export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function isSelfRegistrationEnabled() {
  return (
    (process.env.SELF_REGISTRATION_ENABLED ?? "true").toLowerCase() !== "false"
  );
}
