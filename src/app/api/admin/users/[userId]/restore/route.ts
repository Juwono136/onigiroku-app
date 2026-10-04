import { NextResponse } from "next/server";

import { goRestoreUser } from "@/lib/admin/go-users";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { adminUserIdParamSchema } from "@/lib/validations/admin-users";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const { userId } = await context.params;
  const parsedId = adminUserIdParamSchema.safeParse({ userId });
  if (!parsedId.success) {
    return jsonError("Invalid user id", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goRestoreUser(gate.actorId, parsedId.data.userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin restore user failed", {
      actorId: gate.actorId,
      userId: parsedId.data.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
