import { NextResponse } from "next/server";

import {
  goAdminCreateCategory,
  goAdminListCategories,
} from "@/lib/api/go-learning";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import { categoryUpsertSchema } from "@/lib/validations/learning";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");
  try {
    const data = await goAdminListCategories(gate.actorId, {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 12,
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "ALL",
      sortBy: url.searchParams.get("sortBy") ?? "position",
      sortDir: url.searchParams.get("sortDir") ?? "asc",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin list categories failed", {
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
  const parsed = categoryUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }
  try {
    const data = await goAdminCreateCategory(gate.actorId, {
      ...parsed.data,
      nameEn: parsed.data.nameEn ?? "",
      descriptionId: parsed.data.descriptionId ?? "",
      descriptionEn: parsed.data.descriptionEn ?? "",
      planKey: parsed.data.planKey ?? "free",
      tags: parsed.data.tags ?? [],
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error("Admin create category failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
