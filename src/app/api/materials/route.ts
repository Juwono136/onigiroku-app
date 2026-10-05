import { NextResponse } from "next/server";

import { goStudentListMaterials } from "@/lib/api/go-materials";
import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { assertCanAccessStudentMaterials } from "@/lib/materials/entitlement";
import { logger } from "@/lib/logger";
import { materialsListQuerySchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function GET(request: Request) {
  const session = await getServerSession({ fresh: true });
  if (!session) {
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const allowed = await assertCanAccessStudentMaterials(session);
  if (!allowed) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const url = new URL(request.url);
  const parsed = materialsListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    locale: url.searchParams.get("locale") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortDir: url.searchParams.get("sortDir") ?? undefined,
    // Student surface is always STUDENT + PUBLISHED on Go; ignore client overrides.
    visibility: "STUDENT",
    status: "PUBLISHED",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  const user = getSessionUser(session);
  const role = getSessionRole(session);

  try {
    const data = await goStudentListMaterials(user.id, role, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Student list materials failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (message === "GO_API_UNAVAILABLE" || message === "SERVICE_UNAVAILABLE") {
      return jsonError("Domain API is temporarily unavailable", 503, "GO_API_UNAVAILABLE");
    }
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
