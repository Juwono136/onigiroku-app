import { logger } from "@/lib/logger";

export type PresignUploadInput = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  folder?: string;
};

export type PresignUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresIn: number;
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
  const allowLocalhost = (process.env.STORAGE_ALLOW_LOCALHOST ?? "true") === "true";
  const url = new URL(endpoint);

  if (
    !allowLocalhost &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    throw new Error("Localhost storage endpoint is not allowed in this environment");
  }
}

export function validateUploadInput(input: PresignUploadInput) {
  if (!ALLOWED_MIME.has(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_BYTES) {
    throw new Error(`File size must be between 1 byte and ${MAX_BYTES} bytes`);
  }
  if (!input.filename || input.filename.includes("..") || input.filename.includes("/")) {
    throw new Error("Invalid filename");
  }
}

/**
 * Creates a SeaweedFS object key and returns upload metadata.
 * Upload itself is performed by the client or Go media service against the nginx gateway.
 */
export function buildObjectKey(filename: string, folder = "uploads") {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  const id = crypto.randomUUID();
  return `${folder}/${id}-${safeName}`;
}

export async function createPresignedUpload(
  input: PresignUploadInput,
): Promise<PresignUploadResult> {
  validateUploadInput(input);

  const endpoint = process.env.STORAGE_ENDPOINT;
  const publicBase =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET ?? "onigiroku";

  if (!endpoint || !publicBase) {
    throw new Error("Storage endpoint is not configured");
  }

  assertSafeEndpoint(endpoint);

  const objectKey = buildObjectKey(input.filename, input.folder ?? bucket);
  const uploadUrl = `${endpoint.replace(/\/$/, "")}/${objectKey}`;
  const publicUrl = `${publicBase.replace(/\/$/, "")}/${objectKey}`;

  logger.info("Created storage upload target", {
    objectKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });

  return {
    uploadUrl,
    publicUrl,
    objectKey,
    expiresIn: 900,
  };
}

export function getStorageAuthHeaders(): HeadersInit {
  const authorization = getAuthHeader();
  return authorization ? { Authorization: authorization } : {};
}
