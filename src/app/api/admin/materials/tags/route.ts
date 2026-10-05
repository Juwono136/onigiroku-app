import { NextResponse } from "next/server";

import { goAdminSuggestTags } from "@/lib/api/go-materials";
import { mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limitRaw = Number(url.searchParams.get("limit") ?? 30);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
    : 30;

  try {
    const items = await goAdminSuggestTags(gate.actorId, q, limit);
    return NextResponse.json({ success: true, data: { items } });
  } catch (error) {
    logger.error("Admin suggest tags failed", {
      actorId: gate.actorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
