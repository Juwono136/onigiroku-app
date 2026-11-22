import { NextResponse } from "next/server";

import {
  goAdminArchivePackage,
  goAdminGetPackage,
  goAdminUpdatePackage,
} from "@/lib/api/go-packages";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { normalizeBenefits } from "@/lib/packages/benefits";
import { packageUpsertSchema } from "@/lib/validations/packages";
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
    const data = await goAdminGetPackage(gate.actorId, parsedId.data.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin get package failed", {
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
  const parsed = packageUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "VALIDATION_ERROR",
      422,
      "VALIDATION_ERROR",
    );
  }
  try {
    const data = await goAdminUpdatePackage(gate.actorId, parsedId.data.id, {
      ...parsed.data,
      nameEn: parsed.data.nameEn ?? "",
      descriptionId: parsed.data.descriptionId ?? "",
      descriptionEn: parsed.data.descriptionEn ?? "",
      benefits: normalizeBenefits(parsed.data.benefits),
      discountPercent: parsed.data.discountPercent ?? 0,
      discountStartsAt: parsed.data.discountStartsAt ?? null,
      discountEndsAt: parsed.data.discountEndsAt ?? null,
      accessDurationDays: parsed.data.accessDurationDays ?? null,
      coverObjectKey: parsed.data.coverObjectKey ?? null,
      entitlements: (parsed.data.entitlements ?? []).map((e) => ({
        featureType: e.featureType,
        targetId: e.targetId ?? null,
      })),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin update package failed", {
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
    await goAdminArchivePackage(gate.actorId, parsedId.data.id);
    return NextResponse.json({ success: true, data: { archived: true } });
  } catch (error) {
    logger.error("Admin archive package failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
