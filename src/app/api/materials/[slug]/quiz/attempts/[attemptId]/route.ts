import { NextResponse } from "next/server";

import { goStudentGetQuizAttempt } from "@/lib/api/go-learning";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { assertCanAccessStudentMaterials } from "@/lib/materials/entitlement";
import { materialSlugParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

const attemptIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

type Ctx = { params: Promise<{ slug: string; attemptId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getServerSession({ fresh: true });
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  if (!(await assertCanAccessStudentMaterials(session))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  const { slug, attemptId } = await ctx.params;
  const parsedSlug = materialSlugParamSchema.safeParse({ slug });
  if (!parsedSlug.success) return jsonError("Invalid slug", 422, "VALIDATION_ERROR");
  if (!attemptIdPattern.test(attemptId ?? "")) {
    return jsonError("Invalid attempt id", 422, "VALIDATION_ERROR");
  }

  const user = getSessionUser(session);
  try {
    const data = await goStudentGetQuizAttempt(
      user.id,
      getSessionRole(session),
      parsedSlug.data.slug,
      attemptId,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    logger.error("Student quiz attempt detail failed", { error: message });
    if (message === "LESSON_LOCKED") return jsonError("Lesson locked", 403, "LESSON_LOCKED");
    if (message === "NOT_FOUND") return jsonError("Not found", 404, "NOT_FOUND");
    if (message === "VALIDATION_ERROR") return jsonError("Invalid attempt id", 422, "VALIDATION_ERROR");
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
