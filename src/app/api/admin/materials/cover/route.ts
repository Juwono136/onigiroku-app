import { NextResponse } from "next/server";

import { jsonError, mapAdminUserError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";
import {
  confirmObjectReplacement,
  createPresignedUpload,
  deleteObject,
  extractOwnedObjectKey,
} from "@/lib/storage";

export const runtime = "nodejs";

const COVER_ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const COVER_MAX = 5 * 1024 * 1024;

function assertCmsObjectKey(raw: string): string | null {
  const key = extractOwnedObjectKey(raw.trim());
  if (!key || !key.startsWith("cms/")) return null;
  return key;
}

/**
 * Delete a CMS cover object from SeaweedFS (idempotent).
 * Used when discarding an unsaved upload so storage stays free of orphans.
 */
export async function DELETE(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const raw =
    body && typeof body === "object" && "objectKey" in body
      ? String((body as { objectKey?: unknown }).objectKey ?? "")
      : "";
  const objectKey = assertCmsObjectKey(raw);
  if (!objectKey) {
    return jsonError("Invalid object key", 422, "VALIDATION_ERROR");
  }

  try {
    await deleteObject(objectKey);
    return NextResponse.json({
      success: true,
      data: { deleted: true, objectKey },
    });
  } catch (error) {
    logger.error("CMS cover delete failed", {
      actorId: gate.actorId,
      objectKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}

/** Upload / replace CMS cover image (folder: cms/). */
export async function POST(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > COVER_MAX + 256 * 1024) {
    return jsonError("COVER_SIZE_INVALID", 422, "COVER_SIZE_INVALID");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid multipart body");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("FILE_REQUIRED", 400, "FILE_REQUIRED");
  }
  if (!COVER_ALLOWED.has(file.type)) {
    return jsonError("COVER_TYPE_INVALID", 422, "COVER_TYPE_INVALID");
  }
  if (file.size <= 0 || file.size > COVER_MAX) {
    return jsonError("COVER_SIZE_INVALID", 422, "COVER_SIZE_INVALID");
  }

  const previousRaw = form.get("previousObjectKey");
  const previousKey =
    typeof previousRaw === "string" && previousRaw.trim()
      ? assertCmsObjectKey(previousRaw)
      : null;

  const filename = file.name || `cover.${file.type.split("/")[1] ?? "png"}`;
  let uploadedKey: string | null = null;

  try {
    const target = await createPresignedUpload({
      filename,
      contentType: file.type,
      sizeBytes: file.size,
      folder: "cms",
      previousObjectKey: previousKey ?? undefined,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const put = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: {
        ...target.headers,
        "Content-Type": file.type,
        "Content-Length": String(buffer.byteLength),
      },
      body: buffer,
    });

    if (!put.ok) {
      try {
        await deleteObject(target.objectKey);
      } catch {
        // ignore
      }
      return jsonError("COVER_UPLOAD_FAILED", 502, "COVER_UPLOAD_FAILED");
    }

    uploadedKey = target.objectKey;

    try {
      await confirmObjectReplacement(previousKey);
    } catch (error) {
      logger.warn("CMS cover previous cleanup failed", {
        previousKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        objectKey: target.objectKey,
        publicUrl: target.publicUrl,
      },
    });
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteObject(uploadedKey);
      } catch {
        // ignore
      }
    }
    logger.error("CMS cover upload failed", {
      actorId: gate.actorId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapAdminUserError(error);
  }
}
