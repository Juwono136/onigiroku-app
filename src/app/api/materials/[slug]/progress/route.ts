import { NextResponse } from "next/server";

import { goStudentTouchProgress } from "@/lib/api/go-learning";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { assertCanAccessStudentMaterials } from "@/lib/materials/entitlement";
import { logger } from "@/lib/logger";
import { assertTrustedMutationOrigin } from "@/lib/security/request-origin";
import { progressBodySchema } from "@/lib/validations/learning";
import { materialSlugParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, ctx: Ctx) {
  if (!assertTrustedMutationOrigin(request)) {
    return jsonError("Forbidden origin", 403, "FORBIDDEN_ORIGIN");
  }
  const session = await getServerSession({ fresh: true });
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  if (!(await assertCanAccessStudentMaterials(session))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  const { slug } = await ctx.params;
  const parsedSlug = materialSlugParamSchema.safeParse({ slug });
  if (!parsedSlug.success) return jsonError("Invalid slug", 422, "VALIDATION_ERROR");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = progressBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }
  const user = getSessionUser(session);
  try {
    const data = await goStudentTouchProgress(
      user.id,
      getSessionRole(session),
      parsedSlug.data.slug,
      parsed.data.readingPercent,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    logger.error("Student progress failed", { error: message });
    if (message === "LESSON_LOCKED") {
      return jsonError("Lesson locked", 403, "LESSON_LOCKED");
    }
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
