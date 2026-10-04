import { NextResponse } from "next/server";

import {
  getServerSession,
  getSessionRole,
  getSessionUser,
  type AuthSession,
} from "@/lib/auth/session";
import { assertTrustedMutationOrigin } from "@/lib/security/request-origin";

export function jsonError(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function requireAdminApi(request?: Request): Promise<
  | { session: AuthSession; actorId: string }
  | { response: NextResponse }
> {
  if (
    request &&
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    !assertTrustedMutationOrigin(request)
  ) {
    return { response: jsonError("Forbidden origin", 403, "FORBIDDEN_ORIGIN") };
  }

  const session = await getServerSession({ fresh: true });
  if (!session) {
    return { response: jsonError("Unauthorized", 401, "UNAUTHORIZED") };
  }
  if (getSessionRole(session) !== "ADMIN") {
    return { response: jsonError("Forbidden", 403, "FORBIDDEN") };
  }
  return { session, actorId: getSessionUser(session).id };
}

export function mapAdminUserError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  switch (message) {
    case "CANNOT_MODIFY_SELF":
      return jsonError(
        "You cannot change or delete your own account from Users Management.",
        403,
        "CANNOT_MODIFY_SELF",
      );
    case "USER_NOT_FOUND":
    case "NOT_FOUND":
      return jsonError("User not found", 404, "USER_NOT_FOUND");
    case "USER_NOT_IN_TRASH":
      return jsonError(
        "User must be in trash before permanent delete.",
        409,
        "USER_NOT_IN_TRASH",
      );
    case "LAST_ADMIN":
      return jsonError(
        "Cannot remove or demote the last active admin.",
        409,
        "LAST_ADMIN",
      );
    case "GO_API_UNAVAILABLE":
    case "SERVICE_UNAVAILABLE":
      return jsonError(
        "Domain API is temporarily unavailable",
        503,
        "GO_API_UNAVAILABLE",
      );
    case "UNAUTHORIZED":
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    case "FORBIDDEN":
      return jsonError("Forbidden", 403, "FORBIDDEN");
    case "VALIDATION_ERROR":
      return jsonError("Invalid request", 422, "VALIDATION_ERROR");
    default:
      return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
