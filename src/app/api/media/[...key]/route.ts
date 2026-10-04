import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  assertOwnedObjectKey,
  getStorageAuthHeaders,
} from "@/lib/storage";

export const runtime = "nodejs";

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
  const objectKey = parts.map(decodeURIComponent).join("/");

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
      method: "GET",
      headers: getStorageAuthHeaders(),
      cache: "no-store",
      // Do not forward browser cookies to SeaweedFS.
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

    if (!upstream.ok || !upstream.body) {
      logger.error("Media proxy upstream error", {
        objectKey,
        status: upstream.status,
      });
      return new NextResponse(null, { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const etag = upstream.headers.get("etag");

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    if (contentLength) headers.set("Content-Length", contentLength);
    if (etag) headers.set("ETag", etag);

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

export async function HEAD(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const response = await GET(request, context);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
