import type { MaterialDetail, MaterialLocale } from "@/lib/materials/types";

/** Prefer requested locale; fall back to the other locale or list fields. */
export function pickMaterialLocale(
  material: MaterialDetail,
  locale: string,
): MaterialLocale {
  const preferred = locale === "en" ? "en" : "id";
  const match =
    material.locales.find((item) => item.locale === preferred) ??
    material.locales[0];

  if (match) return match;

  return {
    locale: preferred,
    title: material.title,
    excerpt: material.excerpt,
    body: { type: "doc", content: [{ type: "paragraph" }] },
    seoTitle: "",
    seoDescription: "",
  };
}

/** Resolve public meta title/description with SEO overrides and safe fallbacks. */
export function resolveMaterialSeo(
  material: MaterialDetail,
  locale: string,
): { title: string; description: string } {
  const loc = pickMaterialLocale(material, locale);
  const title = (loc.seoTitle || loc.title || material.title).trim();
  const description = (
    loc.seoDescription ||
    loc.excerpt ||
    material.excerpt ||
    ""
  ).trim();
  return { title, description };
}
