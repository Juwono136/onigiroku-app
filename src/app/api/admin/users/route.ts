import { NextResponse } from "next/server";

import { goListUsers } from "@/lib/admin/go-users";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { adminUsersListQuerySchema } from "@/lib/validations/admin-users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const url = new URL(request.url);
  const parsed = adminUsersListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    scope: url.searchParams.get("scope") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortDir: url.searchParams.get("sortDir") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goListUsers(gate.actorId, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin list users failed", {
      actorId: gate.actorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
