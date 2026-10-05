import { NextResponse } from "next/server";
import { z } from "zod";

import { goAdminDeleteTag } from "@/lib/api/go-materials";
import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const tagIdSchema = z.object({
  tagId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{ tagId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const params = await context.params;
  const parsed = tagIdSchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Invalid tag id", 422, "VALIDATION_ERROR");
  }

  try {
    await goAdminDeleteTag(gate.actorId, parsed.data.tagId);
    return NextResponse.json({
      success: true,
      data: { deleted: true, id: parsed.data.tagId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (message === "TAG_IN_USE") {
      return jsonError(
        "Tag is still used by materials",
        409,
        "TAG_IN_USE",
      );
    }
    if (message === "NOT_FOUND" || message.toLowerCase().includes("not found")) {
      return jsonError("Tag not found", 404, "NOT_FOUND");
    }
    logger.error("Admin delete tag failed", {
      actorId: gate.actorId,
      tagId: parsed.data.tagId,
      error: message,
    });
    return mapAdminUserError(error);
  }
}
