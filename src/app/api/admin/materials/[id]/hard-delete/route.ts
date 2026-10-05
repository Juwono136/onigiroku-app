import { NextResponse } from "next/server";

import { goAdminHardDeleteMaterial } from "@/lib/api/go-materials";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { materialIdParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const { id } = await ctx.params;
  const idParsed = materialIdParamSchema.safeParse({ id });
  if (!idParsed.success) {
    return jsonError("Invalid material id", 422, "VALIDATION_ERROR");
  }

  try {
    await goAdminHardDeleteMaterial(gate.actorId, idParsed.data.id);
    return NextResponse.json({
      success: true,
      data: { deleted: true, id: idParsed.data.id },
    });
  } catch (error) {
    logger.error("Admin hard-delete material failed", {
      actorId: gate.actorId,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
