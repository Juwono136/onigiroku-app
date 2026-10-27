import { NextResponse } from "next/server";

import { goAdminHardDeleteCategory } from "@/lib/api/go-learning";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { materialIdParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  const parsedId = materialIdParamSchema.safeParse({ id });
  if (!parsedId.success) return jsonError("Invalid id", 422, "VALIDATION_ERROR");
  try {
    await goAdminHardDeleteCategory(gate.actorId, parsedId.data.id);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error("Admin hard-delete category failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
