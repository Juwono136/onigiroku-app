import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  assertOwnedObjectKey,
  getStorageAuthHeaders,
} from "@/lib/storage";

export const runtime = "nodejs";

/** Hard cap so a huge object cannot exhaust the Node process under concurrency. */
const MAX_PROXY_BYTES = 25 * 1024 * 1024;

function resolveObjectKey(parts: string[]) {
  return parts.map(decodeURIComponent).join("/");
}

async function proxyFromStorage(
  objectKey: string,
  method: "GET" | "HEAD",
): Promise<NextResponse> {
  try {
    assertOwnedObjectKey(objectKey);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const endpoint = process.env.STORAGE_ENDPOINT?.replace(/\/$/, "");
  if (!endpoint) {
    logger.error("STORAGE_ENDPOINT missing for media proxy");
    return new NextResponse(null, { status: 503 });
  }

  try {
    const upstream = await fetch(`${endpoint}/${objectKey}`, {
      method,
      headers: getStorageAuthHeaders(),
      // Authenticated upstream fetch — browser Cache-Control below still helps.
      cache: "no-store",
      redirect: "manual",
    });

    if (upstream.status === 404 || upstream.status === 410) {
      return new NextResponse(null, { status: 404 });
    }

    if (upstream.status === 401 || upstream.status === 403) {
      logger.error("Media proxy upstream auth failed", {
        objectKey,
        status: upstream.status,
      });
      return new NextResponse(null, { status: 502 });
    }

    if (!upstream.ok) {
      logger.error("Media proxy upstream error", {
        objectKey,
        status: upstream.status,
      });
      return new NextResponse(null, { status: 502 });
    }

    const contentLengthHeader = upstream.headers.get("content-length");
    if (contentLengthHeader) {
      const size = Number(contentLengthHeader);
      if (Number.isFinite(size) && size > MAX_PROXY_BYTES) {
        return new NextResponse(null, { status: 413 });
      }
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const etag = upstream.headers.get("etag");

    const headers = new Headers({
      "Content-Type": contentType,
      // UUID object keys are immutable — safe to cache at the browser.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    if (contentLengthHeader) headers.set("Content-Length", contentLengthHeader);
    if (etag) headers.set("ETag", etag);

    if (method === "HEAD") {
      return new NextResponse(null, { status: 200, headers });
    }

    if (!upstream.body) {
      return new NextResponse(null, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error("Media proxy fetch failed", {
      objectKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 502 });
  }
}

/**
 * Same-origin media proxy for SeaweedFS.
 * Keeps nginx basic-auth credentials server-side so browsers never see a
 * native "Sign in to localhost:8333" dialog when loading avatars/files.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key: parts } = await context.params;
  return proxyFromStorage(resolveObjectKey(parts), "GET");
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key: parts } = await context.params;
  return proxyFromStorage(resolveObjectKey(parts), "HEAD");
}
