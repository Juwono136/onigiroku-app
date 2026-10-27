import type { JSONContent } from "@tiptap/react";

import { tipTapToPlainText } from "@/lib/materials/plain-text";

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const CATEGORY_DESCRIPTION_MAX = 1000;
export const QUESTION_PROMPT_MAX = 800;
export const QUESTION_EXPLANATION_MAX = 2000;

export function docFromStored(raw: string): JSONContent {
  const trimmed = raw.trim();
  if (!trimmed) return EMPTY_DOC;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as JSONContent;
      if (parsed && parsed.type === "doc") {
        if (!Array.isArray(parsed.content) || parsed.content.length === 0) {
          return EMPTY_DOC;
        }
        return parsed;
      }
    } catch {
      // Keep plain text below.
    }
  }
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: raw }] }],
  };
}

export function storedFromDoc(doc: JSONContent): string {
  const plain = tipTapToPlainText(doc).trim();
  if (!plain) return "";
  return JSON.stringify(doc);
}

export function visibleLength(raw: string): number {
  return Array.from(tipTapToPlainText(docFromStored(raw))).length;
}

export function plainExcerpt(raw: string): string {
  return tipTapToPlainText(docFromStored(raw)).replace(/\s+/g, " ").trim();
}
