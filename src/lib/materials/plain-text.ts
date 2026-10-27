import type { JSONContent } from "@tiptap/react";

/** Flatten TipTap JSON into searchable / excerpt plain text. */
export function tipTapToPlainText(body: unknown): string {
  if (!body) return "";
  if (typeof body === "string") return body.trim();
  if (typeof body !== "object") return "";

  const parts: string[] = [];
  walk(body as JSONContent, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function walk(node: JSONContent, parts: string[]) {
  if (typeof node.text === "string") {
    const text = node.text.trim();
    if (text) parts.push(text);
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      walk(child as JSONContent, parts);
    }
  }
}

/** Auto excerpt for list/news cards — first ~200 chars of body. */
export function excerptFromBody(body: unknown, max = 200): string {
  const plain = tipTapToPlainText(body);
  if (!plain) return "";
  if (plain.length <= max) return plain;
  const sliced = plain.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export const CMS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CMS_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const CMS_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const CMS_COVER_HINT =
  "JPEG, PNG, WebP, or GIF · max 5MB · recommended 1600×900 (16:9) · min 640×360";
