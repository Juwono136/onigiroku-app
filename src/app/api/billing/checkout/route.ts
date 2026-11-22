import { NextResponse } from "next/server";

import { goCreateCheckout } from "@/lib/api/go-packages";
import { jsonError, mapLearningAdminError } from "@/lib/admin/guard";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { assertTrustedMutationOrigin } from "@/lib/security/request-origin";
import { checkoutBodySchema } from "@/lib/validations/packages";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertTrustedMutationOrigin(request)) {
    return jsonError("Forbidden origin", 403, "FORBIDDEN_ORIGIN");
  }
  const session = await getServerSession({ fresh: true });
  if (!session) {
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }
  const user = getSessionUser(session);
  const role = getSessionRole(session);
  if (role !== "USER" && role !== "ADMIN") {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = checkoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "VALIDATION_ERROR",
      422,
      "VALIDATION_ERROR",
    );
  }

  try {
    const data = await goCreateCheckout(
      {
        userId: user.id,
        role,
        name: user.name,
        email: user.email,
      },
      parsed.data.packageSlug,
    );
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error("Checkout create failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
