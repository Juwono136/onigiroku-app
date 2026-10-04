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

function assertSafeEndpoint(endpoint: string) {
  const allowLocalhost =
    (process.env.STORAGE_ALLOW_LOCALHOST ?? "true") === "true";
  const url = new URL(endpoint);

  if (
    !allowLocalhost &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1")
  ) {
    throw new Error(
      "Localhost storage endpoint is not allowed in this environment",
    );
  }
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

/**
 * Creates a SeaweedFS object key. UUID prefix prevents collisions / overwrites.
 */
export function buildObjectKey(filename: string, folder = "uploads") {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  const id = crypto.randomUUID();
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  if (!cleanFolder || cleanFolder.includes("..")) {
    throw new Error("Invalid folder");
  }
  return `${cleanFolder}/${id}-${safeName}`;
}

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
  const allowed = [
    `${expectedBucket}/`,
    ...ALLOWED_KEY_ROOTS,
  ];
  if (!allowed.some((root) => key.startsWith(root))) {
    throw new Error("objectKey outside allowed storage namespace");
  }
}

export function getStorageAuthHeaders(): HeadersInit {
  const authorization = getAuthHeader();
  return authorization ? { Authorization: authorization } : {};
}

/**
 * Creates upload target metadata for SeaweedFS (via nginx gateway).
 * Pass `previousObjectKey` when replacing; delete the old object only after
 * the new PUT succeeds (`confirmObjectReplacement`).
 */
export async function createPresignedUpload(
  input: PresignUploadInput,
): Promise<PresignUploadResult> {
  validateUploadInput(input);

  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET ?? "onigiroku";

  if (!endpoint) {
    throw new Error("Storage endpoint is not configured");
  }

  assertSafeEndpoint(endpoint);

  if (input.previousObjectKey) {
    assertOwnedObjectKey(input.previousObjectKey, bucket);
  }

  const objectKey = buildObjectKey(input.filename, input.folder ?? bucket);
  // Upload URL is server-only (may require basic auth). Never hand this to browsers.
  const uploadUrl = `${endpoint.replace(/\/$/, "")}/${objectKey}`;
  // Browser-safe URL (proxied when STORAGE_AUTH_MODE=nginx-basic).
  const publicUrl = buildPublicMediaUrl(objectKey);

  logger.info("Created storage upload target", {
    objectKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    replacing: Boolean(input.previousObjectKey),
  });

  return {
    uploadUrl,
    publicUrl,
    objectKey,
    method: "PUT",
    expiresIn: 900,
    previousObjectKey: input.previousObjectKey,
    deletePreviousAfterConfirm: Boolean(input.previousObjectKey),
    headers: getStorageAuthHeaders(),
  };
}

/**
 * Deletes an object from SeaweedFS. Missing objects (404/410) are success
 * so callers can safely retry (idempotent cleanup).
 */
export async function deleteObject(objectKey: string): Promise<void> {
  const endpoint = process.env.STORAGE_ENDPOINT;
  if (!endpoint) {
    throw new Error("Storage endpoint is not configured");
  }

  assertSafeEndpoint(endpoint);
  assertOwnedObjectKey(objectKey);

  const url = `${endpoint.replace(/\/$/, "")}/${objectKey}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: getStorageAuthHeaders(),
    cache: "no-store",
  });

  if (
    response.ok ||
    response.status === 404 ||
    response.status === 410 ||
    response.status === 204
  ) {
    logger.info("Deleted storage object", { objectKey, status: response.status });
    return;
  }

  logger.error("Failed to delete storage object", {
    objectKey,
    status: response.status,
  });
  throw new Error(`Storage delete failed with status ${response.status}`);
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
