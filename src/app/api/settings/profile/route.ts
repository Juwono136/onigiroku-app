import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { jsonWithAuthCookies } from "@/lib/auth/response-cookies";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { assertTrustedMutationOrigin } from "@/lib/security/request-origin";
import {
  confirmObjectReplacement,
  createPresignedUpload,
  deleteObject,
  extractOwnedObjectKey,
} from "@/lib/storage";
import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  updateProfileSchema,
} from "@/lib/validations/settings";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

function assertMutationOrigin(request: Request) {
  if (!assertTrustedMutationOrigin(request)) {
    return jsonError("Forbidden origin", 403, "FORBIDDEN_ORIGIN");
  }
  return null;
}

async function getFreshSession() {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}

async function updateUserWithCookies(body: {
  name?: string;
  image?: string | null;
}) {
  return auth.api.updateUser({
    body,
    headers: await headers(),
    returnHeaders: true,
  });
}

/** Update display name. */
export async function PATCH(request: Request) {
  const originError = assertMutationOrigin(request);
  if (originError) return originError;

  const session = await getServerSession({ fresh: true });
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(issue?.message ?? "VALIDATION_ERROR", 422, "VALIDATION_ERROR");
  }

  try {
    const result = await updateUserWithCookies({ name: parsed.data.name });
    if (!result?.response) {
      return jsonError("Failed to update profile", 500, "UPDATE_FAILED");
    }

    return jsonWithAuthCookies(
      { success: true, data: { name: parsed.data.name } },
      result.headers,
    );
  } catch (error) {
    logger.error("Profile name update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError(
      error instanceof Error ? error.message : "UPDATE_FAILED",
      400,
      "UPDATE_FAILED",
    );
  }
}

/** Upload / replace avatar image in SeaweedFS (max 5MB). */
export async function POST(request: Request) {
  const originError = assertMutationOrigin(request);
  if (originError) return originError;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  // Multipart overhead; reject obviously oversized bodies early.
  if (contentLength > AVATAR_MAX_BYTES + 256 * 1024) {
    return jsonError("AVATAR_SIZE_INVALID", 422, "AVATAR_SIZE_INVALID");
  }

  const session = await getFreshSession();
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

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

  if (!AVATAR_ALLOWED_MIME.has(file.type)) {
    return jsonError("AVATAR_TYPE_INVALID", 422, "AVATAR_TYPE_INVALID");
  }
  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return jsonError("AVATAR_SIZE_INVALID", 422, "AVATAR_SIZE_INVALID");
  }

  const previousKey = extractOwnedObjectKey(session.user.image);
  const filename = file.name || `avatar.${file.type.split("/")[1] ?? "png"}`;
  let uploadedKey: string | null = null;

  try {
    const target = await createPresignedUpload({
      filename,
      contentType: file.type,
      sizeBytes: file.size,
      folder: "avatars",
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
      logger.error("Avatar PUT to SeaweedFS failed", {
        status: put.status,
        objectKey: target.objectKey,
      });
      try {
        await deleteObject(target.objectKey);
      } catch {
        // ignore
      }
      return jsonError("AVATAR_UPLOAD_FAILED", 502, "AVATAR_UPLOAD_FAILED");
    }

    uploadedKey = target.objectKey;

    const updated = await updateUserWithCookies({ image: target.publicUrl });

    // Best-effort old object cleanup — DB already points to the new key.
    try {
      await confirmObjectReplacement(previousKey);
    } catch (error) {
      logger.warn("Avatar previous object cleanup failed (will retry later)", {
        previousKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return jsonWithAuthCookies(
      {
        success: true,
        data: {
          image: target.publicUrl,
          objectKey: target.objectKey,
        },
      },
      updated.headers,
    );
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteObject(uploadedKey);
      } catch {
        // ignore orphan cleanup failure
      }
    }
    logger.error("Avatar upload failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError(
      error instanceof Error ? error.message : "AVATAR_UPLOAD_FAILED",
      500,
      "AVATAR_UPLOAD_FAILED",
    );
  }
}

/** Remove avatar; deletes SeaweedFS object when owned. */
export async function DELETE(request: Request) {
  const originError = assertMutationOrigin(request);
  if (originError) return originError;

  const session = await getFreshSession();
  if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

  const previousKey = extractOwnedObjectKey(session.user.image);

  try {
    const updated = await updateUserWithCookies({ image: null });

    if (previousKey) {
      try {
        await confirmObjectReplacement(previousKey);
      } catch (error) {
        logger.warn("Avatar delete storage cleanup failed (idempotent retry ok)", {
          previousKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return jsonWithAuthCookies(
      { success: true, data: { image: null } },
      updated.headers,
    );
  } catch (error) {
    logger.error("Avatar delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError("AVATAR_DELETE_FAILED", 500, "AVATAR_DELETE_FAILED");
  }
}
