import { NextResponse } from "next/server";

import { goStudentListCategories } from "@/lib/api/go-learning";
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
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");
  const tagParams = [
    ...url.searchParams.getAll("tag"),
    ...(url.searchParams.get("tags")?.split(",") ?? []),
  ]
    .map((t) => t.trim())
    .filter(Boolean);
  const user = getSessionUser(session);
  try {
    const data = await goStudentListCategories(user.id, getSessionRole(session), {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 12,
      search: url.searchParams.get("search") ?? "",
      sortBy: url.searchParams.get("sortBy") ?? "position",
      sortDir: url.searchParams.get("sortDir") ?? "asc",
      tags: tagParams,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Student list categories failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
