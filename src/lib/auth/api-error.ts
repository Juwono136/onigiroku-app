import { APIError } from "better-auth/api";

/**
 * Throw a Better Auth APIError with both `code` and `message`.
 * OAuth callback only redirects to `onAPIError.errorURL` when `body.code` is set;
 * message-only errors become raw JSON in the browser (unfriendly).
 */
export function throwAuthApiError(
  status: "FORBIDDEN" | "BAD_REQUEST" | "UNAUTHORIZED" | "TOO_MANY_REQUESTS",
  code: string,
) {
  throw new APIError(status, { code, message: code });
}
