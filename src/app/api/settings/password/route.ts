import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getServerSession, getSessionUser } from "@/lib/auth/session";
import { dispatchBrandedEmail } from "@/lib/email/dispatch";
import { resolveEmailLocale } from "@/lib/email/locale";
import { buildPasswordChangedEmail } from "@/lib/email/templates/index";
import { logger } from "@/lib/logger";
import { assertTrustedMutationOrigin } from "@/lib/security/request-origin";
import { changePasswordSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

function resolveAppOrigin() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

/**
 * Change password for credential accounts, then send branded notification email.
 * New password is required on the next sign-in.
 */
export async function POST(request: Request) {
  if (!assertTrustedMutationOrigin(request)) {
    return jsonError("Forbidden origin", 403, "FORBIDDEN_ORIGIN");
  }

  const session = await getServerSession({ fresh: true });
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(
      issue?.message ?? "VALIDATION_ERROR",
      422,
      "VALIDATION_ERROR",
    );
  }

  const reqHeaders = await headers();

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // OWASP: invalidate other sessions after credential change.
        revokeOtherSessions: true,
      },
      headers: reqHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PASSWORD_CHANGE_FAILED";
    logger.warn("Password change failed", { message });
    return jsonError(message, 400, "PASSWORD_CHANGE_FAILED");
  }

  const user = getSessionUser(session);
  const locale = resolveEmailLocale(user, request);
  const loginUrl = `${resolveAppOrigin()}/login`;
  const payload = buildPasswordChangedEmail({
    user: { name: user.name, email: user.email },
    loginUrl,
    locale,
  });

  dispatchBrandedEmail({
    to: user.email,
    subject: payload.subject,
    content: payload.content,
    text: payload.text,
  });

  return NextResponse.json({
    success: true,
    data: { passwordUpdated: true },
  });
}
