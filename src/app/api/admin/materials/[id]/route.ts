import { NextResponse } from "next/server";

import {
  goAdminGetMaterial,
  goAdminSoftDeleteMaterial,
  goAdminUpdateMaterial,
} from "@/lib/api/go-materials";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import {
  materialIdParamSchema,
  materialUpsertSchema,
} from "@/lib/validations/materials";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const idParsed = materialIdParamSchema.safeParse({ id });
  if (!idParsed.success) {
    return jsonError("Invalid material id", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goAdminGetMaterial(gate.actorId, idParsed.data.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin get material failed", {
      actorId: gate.actorId,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const idParsed = materialIdParamSchema.safeParse({ id });
  if (!idParsed.success) {
    return jsonError("Invalid material id", 422, "VALIDATION_ERROR");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = materialUpsertSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goAdminUpdateMaterial(
      gate.actorId,
      idParsed.data.id,
      parsed.data,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin update material failed", {
      actorId: gate.actorId,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  return PUT(request, ctx);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const idParsed = materialIdParamSchema.safeParse({ id });
  if (!idParsed.success) {
    return jsonError("Invalid material id", 422, "VALIDATION_ERROR");
  }

  try {
    await goAdminSoftDeleteMaterial(gate.actorId, idParsed.data.id);
    return NextResponse.json({ success: true, data: { deleted: true, id: idParsed.data.id } });
  } catch (error) {
    logger.error("Admin soft-delete material failed", {
      actorId: gate.actorId,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
