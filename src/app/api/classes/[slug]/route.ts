import { NextResponse } from "next/server";

import { goPublicGetPackage } from "@/lib/api/go-packages";
import { logger } from "@/lib/logger";
import { parseBuySlug } from "@/lib/packages/buy-intent";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

type Ctx = { params: Promise<{ slug: string }> };

/** Public package detail (thin BFF over the Go public endpoint). */
export async function GET(_request: Request, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const slug = parseBuySlug(rawSlug);
  if (!slug) return jsonError("Invalid slug", 422, "VALIDATION_ERROR");

  try {
    const data = await goPublicGetPackage(slug);
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (message.includes("NOT_FOUND")) {
      return jsonError("Not found", 404, "NOT_FOUND");
    }
    logger.error("Public get package failed", { slug, error: message });
    return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
  }
}
