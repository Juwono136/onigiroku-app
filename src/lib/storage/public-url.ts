/**
 * Browser-safe media URLs.
 *
 * When SeaweedFS sits behind nginx basic-auth, the browser must NEVER load
 * `STORAGE_ENDPOINT` / `NEXT_PUBLIC_STORAGE_URL` directly (triggers a native
 * username/password dialog). Public URLs go through `/api/media/*` instead;
 * the route proxies with server-side credentials.
 */

export const MEDIA_PROXY_PREFIX = "/api/media";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

function storageBases(): string[] {
  return [process.env.NEXT_PUBLIC_STORAGE_URL, process.env.STORAGE_ENDPOINT]
    .filter(Boolean)
    .map((b) => trimSlash(String(b)));
}

/** True when the gateway requires credentials that must stay server-side. */
export function usesStorageBasicAuth() {
  return (process.env.STORAGE_AUTH_MODE ?? "nginx-basic") === "nginx-basic";
}

/**
 * Public URL stored in DB / returned to clients.
 * Prefer same-origin proxy when storage uses nginx-basic auth.
 */
export function buildPublicMediaUrl(objectKey: string): string {
  const key = objectKey.replace(/^\/+/, "");
  if (!key) throw new Error("objectKey is required");

  if (usesStorageBasicAuth()) {
    return `${MEDIA_PROXY_PREFIX}/${key}`;
  }

  const publicBase =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? process.env.STORAGE_ENDPOINT;
  if (!publicBase) {
    return `${MEDIA_PROXY_PREFIX}/${key}`;
  }
  return `${trimSlash(publicBase)}/${key}`;
}

/**
 * Rewrite legacy direct-gateway URLs (e.g. http://localhost:8333/avatars/…)
 * to the app media proxy so <img> never triggers basic-auth prompts.
 * External URLs (Google avatars, CDN) are returned unchanged.
 */
export function toBrowserMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;

  if (
    value.startsWith(`${MEDIA_PROXY_PREFIX}/`) ||
    value.startsWith(`${MEDIA_PROXY_PREFIX}?`)
  ) {
    return value;
  }

  // Absolute app URL pointing at the proxy.
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith(`${MEDIA_PROXY_PREFIX}/`)) {
        return `${parsed.pathname}${parsed.search}`;
      }
    }
  } catch {
    // fall through
  }

  const key = extractOwnedObjectKey(value);
  if (key) {
    return `${MEDIA_PROXY_PREFIX}/${key}`;
  }

  return value;
}

/** Extract SeaweedFS object key from a public/storage/proxy URL, if owned by us. */
export function extractOwnedObjectKey(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl) return null;
  const value = imageUrl.trim();
  if (!value) return null;

  // Proxy path: /api/media/avatars/uuid-file.png
  if (value.startsWith(`${MEDIA_PROXY_PREFIX}/`)) {
    const key = value.slice(MEDIA_PROXY_PREFIX.length + 1).split("?")[0] ?? "";
    return key && !key.includes("..") ? key : null;
  }

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith(`${MEDIA_PROXY_PREFIX}/`)) {
        const key =
          parsed.pathname.slice(MEDIA_PROXY_PREFIX.length + 1).split("?")[0] ??
          "";
        return key && !key.includes("..") ? key : null;
      }
    }
  } catch {
    // fall through
  }

  for (const base of storageBases()) {
    if (value.startsWith(`${base}/`)) {
      const key = value.slice(base.length + 1).split("?")[0] ?? "";
      if (key && !key.includes("..")) return key;
    }
  }

  return null;
}
