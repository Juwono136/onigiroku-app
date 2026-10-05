import { NextResponse } from "next/server";

import { goStudentGetMaterial } from "@/lib/api/go-materials";
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
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getServerSession({ fresh: true });
  if (!session) {
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const allowed = await assertCanAccessStudentMaterials(session);
  if (!allowed) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const { slug } = await ctx.params;
  const parsed = materialSlugParamSchema.safeParse({ slug });
  if (!parsed.success) {
    return jsonError("Invalid slug", 422, "VALIDATION_ERROR");
  }

  const user = getSessionUser(session);
  const role = getSessionRole(session);

  try {
    const data = await goStudentGetMaterial(user.id, role, parsed.data.slug);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Student get material failed", {
      userId: user.id,
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (message === "NOT_FOUND" || message.includes("NOT_FOUND")) {
      return jsonError("Material not found", 404, "NOT_FOUND");
    }
    if (message === "GO_API_UNAVAILABLE" || message === "SERVICE_UNAVAILABLE") {
      return jsonError("Domain API is temporarily unavailable", 503, "GO_API_UNAVAILABLE");
    }
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
