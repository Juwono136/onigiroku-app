import { callGoApi } from "@/lib/api/go-client";
import { logger } from "@/lib/logger";
import { buildPublicMediaUrl } from "@/lib/storage/public-url";

export type PresignUploadInput = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  folder?: string;
  /** Existing object key to remove after a successful replace upload. */
  previousObjectKey?: string;
};

export {
  buildPublicMediaUrl,
  extractOwnedObjectKey,
  MEDIA_PROXY_PREFIX,
  toBrowserMediaUrl,
  usesStorageBasicAuth,
} from "@/lib/storage/public-url";

export type PresignUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  method: "PUT";
  expiresIn: number;
  previousObjectKey?: string;
  /** Caller must delete previousObjectKey only after the new upload succeeds. */
  deletePreviousAfterConfirm: boolean;
  /** Auth headers for server-side upload/delete via nginx-basic gateway. */
  headers: HeadersInit;
};

type GoPresignData = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  method: string;
  expiresIn: number;
  previousObjectKey?: string;
  deletePreviousAfterConfirm?: boolean;
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
]);

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_KEY_ROOTS = [
  "uploads/",
  "media/",
  "cms/",
  "avatars/",
] as const;

/** Validates object keys for the Next media proxy (browser → SeaweedFS). */
export function assertOwnedObjectKey(objectKey: string, bucket?: string) {
  const key = objectKey.trim();
  if (!key) throw new Error("objectKey is required");
  if (
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key !== key.replace(/\\/g, "/")
  ) {
    throw new Error("Invalid objectKey");
  }

  const expectedBucket = (bucket ?? process.env.STORAGE_BUCKET ?? "onigiroku")
    .replace(/^\/+|\/+$/g, "");
  const allowed = [`${expectedBucket}/`, ...ALLOWED_KEY_ROOTS];
  if (!allowed.some((root) => key.startsWith(root))) {
    throw new Error("objectKey outside allowed storage namespace");
  }
}

function getAuthHeader() {
  const mode = process.env.STORAGE_AUTH_MODE ?? "nginx-basic";
  if (mode !== "nginx-basic") return undefined;

  const username = process.env.USERNAME_STORAGE;
  const password = process.env.PASSWORD_STORAGE;
  if (!username || !password) {
    throw new Error("Storage basic auth credentials are missing");
  }

  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
}

export function validateUploadInput(input: PresignUploadInput) {
  if (!ALLOWED_MIME.has(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_BYTES) {
    throw new Error(`File size must be between 1 byte and ${MAX_BYTES} bytes`);
  }
  if (
    !input.filename ||
    input.filename.includes("..") ||
    input.filename.includes("/") ||
    input.filename.includes("\\")
  ) {
    throw new Error("Invalid filename");
  }
}

export function getStorageAuthHeaders(): HeadersInit {
  const authorization = getAuthHeader();
  return authorization ? { Authorization: authorization } : {};
}

/**
 * Creates upload target metadata via Go media domain (`POST /api/media/presign`).
 * Pass `previousObjectKey` when replacing; delete the old object only after
 * the new PUT succeeds (`confirmObjectReplacement`).
 */
export async function createPresignedUpload(
  input: PresignUploadInput,
): Promise<PresignUploadResult> {
  validateUploadInput(input);

  const result = await callGoApi<GoPresignData>("/api/media/presign", {
    method: "POST",
    body: {
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      folder: input.folder ?? "uploads",
      previousObjectKey: input.previousObjectKey,
      replaceAfterUpload: Boolean(input.previousObjectKey),
    },
  });

  if (!result.success || !result.data) {
    throw new Error(result.error?.code ?? "STORAGE_PRESIGN_FAILED");
  }

  const data = result.data;
  logger.info("Created storage upload target via Go", {
    objectKey: data.objectKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    replacing: Boolean(input.previousObjectKey),
  });

  // Prefer relative proxy URL for DB storage (portable across local/prod hosts).
  const publicUrl = buildPublicMediaUrl(data.objectKey);

  return {
    uploadUrl: data.uploadUrl,
    publicUrl,
    objectKey: data.objectKey,
    method: "PUT",
    expiresIn: data.expiresIn ?? 900,
    previousObjectKey: data.previousObjectKey ?? input.previousObjectKey,
    deletePreviousAfterConfirm: Boolean(
      data.deletePreviousAfterConfirm ?? input.previousObjectKey,
    ),
    headers: getStorageAuthHeaders(),
  };
}

/**
 * Deletes an object via Go media domain (`POST /api/media/delete`).
 * Missing objects are treated as success (idempotent).
 */
export async function deleteObject(objectKey: string): Promise<void> {
  const key = objectKey.trim();
  if (!key) throw new Error("objectKey is required");

  const result = await callGoApi<{ deleted?: boolean; objectKey?: string }>(
    "/api/media/delete",
    {
      method: "POST",
      body: { objectKey: key },
    },
  );

  if (!result.success) {
    logger.error("Failed to delete storage object via Go", {
      objectKey: key,
      code: result.error?.code,
    });
    throw new Error(result.error?.code ?? "STORAGE_DELETE_FAILED");
  }

  logger.info("Deleted storage object via Go", { objectKey: key });
}

/**
 * After a successful PUT of the new object, remove the previous key so
 * SeaweedFS does not retain orphaned duplicates.
 */
export async function confirmObjectReplacement(
  previousObjectKey: string | undefined | null,
): Promise<void> {
  if (!previousObjectKey) return;
  await deleteObject(previousObjectKey);
}

/**
 * Convenience: create a new upload target intended to replace an existing object.
 * Does NOT delete yet — call `confirmObjectReplacement` after upload succeeds.
 */
export async function createReplacementUpload(
  input: PresignUploadInput & { previousObjectKey: string },
): Promise<PresignUploadResult> {
  return createPresignedUpload(input);
}
