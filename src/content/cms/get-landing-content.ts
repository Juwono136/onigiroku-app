import { getTranslations } from "next-intl/server";

import type {
  LandingAnnouncementIcon,
  LandingAnnouncementSlide,
  LandingLocale,
  LandingPageContent,
} from "@/content/cms/landing-types";
import { LANDING_ANNOUNCEMENT_MAX_SLIDES } from "@/content/cms/landing-types";
import { goFeaturedNews } from "@/lib/api/go-materials";
import { toBrowserMediaUrl } from "@/lib/storage";

const FEATURE_IDS = [
  "practice",
  "assessment",
  "analytics",
  "materials",
  "integrity",
  "bilingual",
] as const;

const ANNOUNCEMENT_IDS = [
  "welcome",
  "trial",
  "mastery",
  "jlpt",
  "update",
] as const;

const ANNOUNCEMENT_ICONS: Record<
  (typeof ANNOUNCEMENT_IDS)[number],
  LandingAnnouncementIcon
> = {
  welcome: "sparkles",
  trial: "clock",
  mastery: "chart",
  jlpt: "graduation",
  update: "bell",
};

const FEATURED_ICON_ROTATION: LandingAnnouncementIcon[] = [
  "bell",
  "sparkles",
  "clock",
  "chart",
  "graduation",
];

const STEP_IDS = ["one", "two", "three"] as const;
const FAQ_IDS = ["q1", "q2", "q3", "q4"] as const;

async function buildSeedAnnouncementSlides(
  locale: LandingLocale,
): Promise<LandingAnnouncementSlide[]> {
  const announcements = await getTranslations({
    locale,
    namespace: "announcements",
  });

  return ANNOUNCEMENT_IDS.map((id) => {
    const enabledRaw = announcements(`slides.${id}.enabled`);
    const enabled = enabledRaw !== "false" && enabledRaw !== "0";
    const hrefRaw = announcements(`slides.${id}.href`);
    const href =
      !hrefRaw || hrefRaw === "#" || hrefRaw === "null" ? null : hrefRaw;

    return {
      id,
      imageSrc: null,
      imageAlt: announcements(`slides.${id}.imageAlt`),
      icon: ANNOUNCEMENT_ICONS[id],
      title: announcements(`slides.${id}.title`),
      caption: announcements(`slides.${id}.caption`),
      href,
      enabled,
    };
  })
    .filter((slide) => slide.enabled)
    .slice(0, LANDING_ANNOUNCEMENT_MAX_SLIDES);
}

async function buildFeaturedNewsSlides(
  locale: LandingLocale,
): Promise<LandingAnnouncementSlide[]> {
  try {
    const items = await goFeaturedNews(locale);
    if (!items.length) return [];

    return items.slice(0, LANDING_ANNOUNCEMENT_MAX_SLIDES).map((item, index) => {
      const imageSrc = toBrowserMediaUrl(item.coverUrl);
      return {
        id: item.slug || `cms-${item.id}`,
        imageSrc,
        imageAlt: item.title,
        icon: FEATURED_ICON_ROTATION[index % FEATURED_ICON_ROTATION.length] ?? "bell",
        title: item.title,
        caption: item.excerpt || item.title,
        href: `/news/${item.slug}`,
        enabled: true,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Resolve public landing content for a locale.
 * Announcement slides prefer featured PUBLIC news; fall back to i18n seeds.
 * Announcement slides are capped at LANDING_ANNOUNCEMENT_MAX_SLIDES.
 */
export async function getLandingPageContent(
  locale: LandingLocale,
): Promise<LandingPageContent> {
  const hero = await getTranslations({ locale, namespace: "hero" });
  const announcements = await getTranslations({
    locale,
    namespace: "announcements",
  });
  const features = await getTranslations({ locale, namespace: "features" });
  const how = await getTranslations({ locale, namespace: "howItWorks" });
  const preview = await getTranslations({ locale, namespace: "preview" });
  const pricing = await getTranslations({ locale, namespace: "pricing" });
  const faq = await getTranslations({ locale, namespace: "faq" });
  const cta = await getTranslations({ locale, namespace: "cta" });

  const cmsSlides = await buildFeaturedNewsSlides(locale);
  const slides =
    cmsSlides.length > 0
      ? cmsSlides
      : await buildSeedAnnouncementSlides(locale);

  const autoPlayRaw = Number(announcements("autoPlayMs"));
  const autoPlayMs = Number.isFinite(autoPlayRaw)
    ? Math.max(0, Math.min(autoPlayRaw, 60_000))
    : 6500;

  return {
    locale,
    sectionOrder: [
      "hero",
      "announcements",
      "features",
      "howItWorks",
      "preview",
      "pricing",
      "faq",
      "cta",
    ],
    hero: {
      enabled: true,
      eyebrow: hero("eyebrow"),
      title: hero("title"),
      subtitle: hero("subtitle"),
      ctaPrimary: hero("ctaPrimary"),
      ctaSecondary: hero("ctaSecondary"),
      trust: hero("trust"),
      orbLabel: hero("orbLabel"),
      orbHint: hero("orbHint"),
      scrollExplore: hero("scrollExplore"),
    },
    announcements: {
      enabled: slides.length > 0,
      eyebrow: announcements("eyebrow"),
      title: announcements("title"),
      subtitle: announcements("subtitle"),
      slideKicker: announcements("slideKicker"),
      prevLabel: announcements("prevLabel"),
      nextLabel: announcements("nextLabel"),
      autoPlayMs,
      slides,
    },
    features: {
      enabled: true,
      eyebrow: features("eyebrow"),
      title: features("title"),
      subtitle: features("subtitle"),
      items: FEATURE_IDS.map((id) => ({
        id,
        icon: id,
        title: features(`items.${id}.title`),
        description: features(`items.${id}.description`),
      })),
    },
    howItWorks: {
      enabled: true,
      eyebrow: how("eyebrow"),
      title: how("title"),
      subtitle: how("subtitle"),
      steps: STEP_IDS.map((id) => ({
        id,
        title: how(`steps.${id}.title`),
        description: how(`steps.${id}.description`),
      })),
    },
    preview: {
      enabled: true,
      title: preview("title"),
      subtitle: preview("subtitle"),
      readiness: preview("readiness"),
      mastery: preview("mastery"),
      streak: preview("streak"),
      weak: preview("weak"),
      weakValue: preview("weakValue"),
      readinessValue: preview("readinessValue"),
      masteryValue: preview("masteryValue"),
      streakValue: preview("streakValue"),
    },
    pricing: {
      enabled: true,
      title: pricing("title"),
      subtitle: pricing("subtitle"),
      currencyNote: pricing("currencyNote"),
      plans: [
        {
          id: "trial",
          name: pricing("trial.name"),
          price: pricing("trial.price"),
          period: pricing("trial.period"),
          cta: pricing("trial.cta"),
          features: pricing.raw("trial.features") as string[],
        },
        {
          id: "pro",
          name: pricing("pro.name"),
          price: pricing("pro.price"),
          period: pricing("pro.period"),
          cta: pricing("pro.cta"),
          badge: pricing("pro.badge"),
          featured: true,
          features: pricing.raw("pro.features") as string[],
        },
      ],
    },
    faq: {
      enabled: true,
      title: faq("title"),
      subtitle: faq("subtitle"),
      items: FAQ_IDS.map((id) => ({
        id,
        question: faq(`items.${id}.question`),
        answer: faq(`items.${id}.answer`),
      })),
    },
    cta: {
      enabled: true,
      title: cta("title"),
      subtitle: cta("subtitle"),
      button: cta("button"),
    },
  };
}
