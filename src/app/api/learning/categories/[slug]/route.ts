import { NextResponse } from "next/server";

import { goStudentGetCategory } from "@/lib/api/go-learning";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { assertCanAccessStudentMaterials } from "@/lib/materials/entitlement";
import { logger } from "@/lib/logger";
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
  const parsed = materialSlugParamSchema.safeParse({ slug });
  if (!parsed.success) return jsonError("Invalid slug", 422, "VALIDATION_ERROR");
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "id";
  const user = getSessionUser(session);
  try {
    const data = await goStudentGetCategory(user.id, getSessionRole(session), parsed.data.slug, locale);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    logger.error("Student get category failed", { error: message });
    if (message === "NOT_FOUND" || message.includes("NOT_FOUND")) {
      return jsonError("Not found", 404, "NOT_FOUND");
    }
    if (message === "FORBIDDEN") return jsonError("Forbidden", 403, "FORBIDDEN");
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
