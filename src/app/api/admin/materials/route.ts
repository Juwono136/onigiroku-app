import { NextResponse } from "next/server";

import {
  goAdminCreateMaterial,
  goAdminListMaterials,
} from "@/lib/api/go-materials";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import {
  materialUpsertSchema,
  materialsListQuerySchema,
} from "@/lib/validations/materials";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const url = new URL(request.url);
  const parsed = materialsListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    visibility: url.searchParams.get("visibility") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    featured: url.searchParams.get("featured") ?? undefined,
    locale: url.searchParams.get("locale") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortDir: url.searchParams.get("sortDir") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goAdminListMaterials(gate.actorId, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Admin list materials failed", {
      actorId: gate.actorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
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

  const parsed = materialUpsertSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  try {
    const data = await goAdminCreateMaterial(gate.actorId, parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error("Admin create material failed", {
      actorId: gate.actorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
