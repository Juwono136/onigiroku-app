import { NextResponse } from "next/server";

import {
  goGetUser,
  goSoftDeleteUser,
  goUpdateUser,
} from "@/lib/admin/go-users";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import {
  adminUserIdParamSchema,
  adminUserUpdateSchema,
} from "@/lib/validations/admin-users";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

async function parseUserId(context: RouteContext) {
  const { userId } = await context.params;
  return adminUserIdParamSchema.safeParse({ userId });
}

export async function GET(request: Request, context: RouteContext) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const parsedId = await parseUserId(context);
  if (!parsedId.success) {
    return jsonError("Invalid user id", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goGetUser(gate.actorId, parsedId.data.userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin get user failed", {
      actorId: gate.actorId,
      userId: parsedId.data.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const parsedId = await parseUserId(context);
  if (!parsedId.success) {
    return jsonError("Invalid user id", 422, "VALIDATION_ERROR");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goUpdateUser(
      gate.actorId,
      parsedId.data.userId,
      parsed.data,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin update user failed", {
      actorId: gate.actorId,
      userId: parsedId.data.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const parsedId = await parseUserId(context);
  if (!parsedId.success) {
    return jsonError("Invalid user id", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goSoftDeleteUser(gate.actorId, parsedId.data.userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin soft-delete user failed", {
      actorId: gate.actorId,
      userId: parsedId.data.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
