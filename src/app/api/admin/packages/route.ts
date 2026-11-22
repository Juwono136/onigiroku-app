import { NextResponse } from "next/server";

import {
  goAdminCreatePackage,
  goAdminListPackages,
} from "@/lib/api/go-packages";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { normalizeBenefits } from "@/lib/packages/benefits";
import { packageUpsertSchema } from "@/lib/validations/packages";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");
  try {
    const data = await goAdminListPackages(gate.actorId, {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 12,
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "ALL",
      sortBy: url.searchParams.get("sortBy") ?? "position",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin list packages failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}

export async function POST(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
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
    const data = await goAdminCreatePackage(gate.actorId, {
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
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error("Admin create package failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
