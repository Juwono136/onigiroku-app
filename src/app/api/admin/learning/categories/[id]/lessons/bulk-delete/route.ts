import { NextResponse } from "next/server";

import { goAdminBulkDeleteLessons } from "@/lib/api/go-learning";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { lessonBulkDeleteSchema } from "@/lib/validations/learning";
import { materialIdParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
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
  const parsed = lessonBulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "VALIDATION_ERROR",
      422,
      "VALIDATION_ERROR",
    );
  }
  try {
    const data = await goAdminBulkDeleteLessons(
      gate.actorId,
      parsedId.data.id,
      parsed.data.ids,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin bulk-delete lessons failed", {
      actorId: gate.actorId,
      categoryId: id,
      count: parsed.data.ids.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
