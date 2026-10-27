import { NextResponse } from "next/server";

import {
  goAdminArchiveCategory,
  goAdminGetCategory,
  goAdminUpdateCategory,
} from "@/lib/api/go-learning";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { categoryUpsertSchema } from "@/lib/validations/learning";
import { materialIdParamSchema } from "@/lib/validations/materials";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  const parsedId = materialIdParamSchema.safeParse({ id });
  if (!parsedId.success) return jsonError("Invalid id", 422, "VALIDATION_ERROR");
  try {
    const data = await goAdminGetCategory(gate.actorId, parsedId.data.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin get category failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}

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
  const parsed = categoryUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }
  try {
    const data = await goAdminUpdateCategory(gate.actorId, parsedId.data.id, {
      ...parsed.data,
      nameEn: parsed.data.nameEn ?? "",
      descriptionId: parsed.data.descriptionId ?? "",
      descriptionEn: parsed.data.descriptionEn ?? "",
      planKey: parsed.data.planKey ?? "free",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin update category failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
  const { id } = await ctx.params;
  const parsedId = materialIdParamSchema.safeParse({ id });
  if (!parsedId.success) return jsonError("Invalid id", 422, "VALIDATION_ERROR");
  try {
    await goAdminArchiveCategory(gate.actorId, parsedId.data.id);
    return NextResponse.json({ success: true, data: { archived: true } });
  } catch (error) {
    logger.error("Admin archive category failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
