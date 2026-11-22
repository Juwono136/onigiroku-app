import type { ClassPackage, PackageBenefit } from "@/lib/packages/types";

export const BENEFITS_MAX = 20;
export const BENEFIT_TEXT_MAX = 200;
/** Visible (plain text) description length shown to admins and students. */
export const PACKAGE_DESCRIPTION_MAX = 800;
/** Stored length cap — TipTap JSON is much longer than its visible text. */
export const PACKAGE_DESCRIPTION_STORED_MAX = 20000;

/** Trim, cap length, and drop rows that are empty in both languages. */
export function normalizeBenefits(
  raw: ReadonlyArray<Partial<PackageBenefit> | null | undefined> | null | undefined,
): PackageBenefit[] {
  if (!Array.isArray(raw)) return [];
  const out: PackageBenefit[] = [];
  for (const item of raw) {
    const textId = Array.from((item?.textId ?? "").trim())
      .slice(0, BENEFIT_TEXT_MAX)
      .join("");
    const textEn = Array.from((item?.textEn ?? "").trim())
      .slice(0, BENEFIT_TEXT_MAX)
      .join("");
    if (!textId && !textEn) continue;
    out.push({ textId, textEn });
    if (out.length >= BENEFITS_MAX) break;
  }
  return out;
}

/** Single benefit line for a locale, falling back to the other language. */
export function benefitText(benefit: PackageBenefit, locale: string): string {
  const primary = locale === "en" ? benefit.textEn : benefit.textId;
  const fallback = locale === "en" ? benefit.textId : benefit.textEn;
  return (primary || fallback || "").trim();
}

/** Localized, non-empty benefit lines for a package. */
export function packageBenefitLines(
  pkg: Pick<ClassPackage, "benefits">,
  locale: string,
): string[] {
  return normalizeBenefits(pkg.benefits)
    .map((b) => benefitText(b, locale))
    .filter(Boolean);
}
