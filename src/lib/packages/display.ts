import type { JSONContent } from "@tiptap/react";

import { docFromStored } from "@/lib/learning/rich-text";
import type { ClassPackage } from "@/lib/packages/types";

export function packageName(pkg: ClassPackage, locale: string): string {
  const name =
    locale === "en" ? pkg.nameEn || pkg.nameId : pkg.nameId || pkg.nameEn;
  return name || pkg.slug;
}

const TEXT_BLOCKS = new Set(["paragraph", "heading", "codeBlock"]);
const LIST_BLOCKS = new Set(["bulletList", "orderedList"]);

function inlineText(node: JSONContent): string {
  if (typeof node.text === "string") return node.text;
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

function collectBlocks(node: JSONContent, out: string[]) {
  if (TEXT_BLOCKS.has(node.type ?? "")) {
    const text = inlineText(node).trim();
    if (text) out.push(text);
    return;
  }
  if (LIST_BLOCKS.has(node.type ?? "")) {
    const ordered = node.type === "orderedList";
    const lines = (node.content ?? [])
      .map((item, index) => {
        const inner: string[] = [];
        collectBlocks(item, inner);
        const text = inner.join(" ").trim();
        return text ? `${ordered ? `${index + 1}.` : "•"} ${text}` : "";
      })
      .filter(Boolean);
    if (lines.length) out.push(lines.join("\n"));
    return;
  }
  if (typeof node.text === "string") {
    if (node.text.trim()) out.push(node.text.trim());
    return;
  }
  for (const child of node.content ?? []) collectBlocks(child, out);
}

/** Plain text (paragraphs separated by blank lines) from TipTap JSON or legacy text. */
export function descriptionToText(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const blocks: string[] = [];
  collectBlocks(docFromStored(trimmed), blocks);
  return blocks.join("\n\n");
}

/** Localized description as plain text (descriptions may be stored as TipTap JSON). */
export function packageDescription(pkg: ClassPackage, locale: string): string {
  return descriptionToText(
    locale === "en"
      ? pkg.descriptionEn || pkg.descriptionId
      : pkg.descriptionId || pkg.descriptionEn,
  );
}

export function packageExcerpt(raw: string, max = 120): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max).replace(/\s+\S*$/, "").trim();
  return `${slice || text.slice(0, max)}…`;
}

const KNOWN_ENTITLEMENT_TYPES = [
  "learning_path",
  "quiz",
  "exam",
  "private_class",
  "practice",
];

/** i18n key suffix under `classesPage.entitlements.types.*`. */
export function entitlementTypeKey(featureType: string): string {
  return KNOWN_ENTITLEMENT_TYPES.includes(featureType) ? featureType : "unknown";
}

export type PriceBreakdown = {
  base: number;
  discountAmount: number;
  total: number;
  discountPercent: number;
  discounted: boolean;
};

/** Derive display amounts. `effectivePriceIdr` from the API is the source of truth. */
export function packagePriceBreakdown(pkg: ClassPackage): PriceBreakdown {
  const base = Math.max(0, Math.round(pkg.priceIdr));
  const total = Math.max(0, Math.round(pkg.effectivePriceIdr));
  const discounted = pkg.discountActive && total < base;
  return {
    base,
    total,
    discountAmount: discounted ? base - total : 0,
    discountPercent: discounted ? pkg.discountPercent : 0,
    discounted,
  };
}