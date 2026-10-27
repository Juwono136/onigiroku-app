import { NextResponse } from "next/server";

import { goAdminReorderLessons } from "@/lib/api/go-learning";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { lessonOrderSchema } from "@/lib/validations/learning";
import { materialIdParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  const parsedId = materialIdParamSchema.safeParse({ id });
  if (!parsedId.success) return jsonError("Invalid id", 422, "VALIDATION_ERROR");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = lessonOrderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }
  try {
    await goAdminReorderLessons(gate.actorId, parsedId.data.id, parsed.data.ids);
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    logger.error("Admin reorder lessons failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
