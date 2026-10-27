import { NextResponse } from "next/server";

import { goStudentListCategoryTags } from "@/lib/api/go-learning";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { assertCanAccessStudentMaterials } from "@/lib/materials/entitlement";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const session = await getServerSession({ fresh: true });
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  if (!(await assertCanAccessStudentMaterials(session))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "40");
  const user = getSessionUser(session);
  try {
    const data = await goStudentListCategoryTags(
      user.id,
      getSessionRole(session),
      Number.isFinite(limit) ? limit : 40,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Student list category tags failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
