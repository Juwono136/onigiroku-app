import { NextResponse } from "next/server";

import { goStudentListQuizAttempts } from "@/lib/api/go-learning";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { assertCanAccessStudentMaterials } from "@/lib/materials/entitlement";
import { materialSlugParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const session = await getServerSession({ fresh: true });
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  if (!(await assertCanAccessStudentMaterials(session))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  const { slug } = await ctx.params;
  const parsedSlug = materialSlugParamSchema.safeParse({ slug });
  if (!parsedSlug.success) return jsonError("Invalid slug", 422, "VALIDATION_ERROR");

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.trunc(rawLimit))) : 50;

  const user = getSessionUser(session);
  try {
    const data = await goStudentListQuizAttempts(
      user.id,
      getSessionRole(session),
      parsedSlug.data.slug,
      limit,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    logger.error("Student quiz history failed", { error: message });
    if (message === "LESSON_LOCKED") return jsonError("Lesson locked", 403, "LESSON_LOCKED");
    if (message === "NOT_FOUND") return jsonError("Not found", 404, "NOT_FOUND");
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
