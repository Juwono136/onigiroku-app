import { NextResponse } from "next/server";

import { goPublicListPackages } from "@/lib/api/go-packages";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

/** Public catalog list (published packages only; search + featured order). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");
  try {
    const data = await goPublicListPackages({
      page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
      pageSize:
        Number.isFinite(pageSize) && pageSize >= 1
          ? Math.min(50, Math.floor(pageSize))
          : 12,
      search: (url.searchParams.get("search") ?? url.searchParams.get("q") ?? "").trim(),
      sortBy: "position",
    });
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    logger.error("Public list packages failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
