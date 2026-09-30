/**

 * CMS-ready landing page content contract (PRD FR-CMS-001, §10.4 CMS Service).

 *

 * Today: filled from `src/messages/{locale}.json` via next-intl.

 * Later: replaced by admin CMS (`pages` / `page_versions` / `faqs` / `seo_metadata`)

 * without rewriting section UI components — only the loader changes.

 */



export type LandingLocale = "id" | "en";



export type CmsTextField = {

  /** Stable CMS field key */

  key: string;

  value: string;

};



export type LandingHeroContent = {

  enabled: boolean;

  eyebrow: string;

  title: string;

  subtitle: string;

  ctaPrimary: string;

  ctaSecondary: string;

  trust: string;

  orbLabel: string;

  orbHint: string;

  /** Hero “scroll to explore” cue label */
  scrollExplore: string;

};



/** Max 5 announcement slides on the public landing (enforced in loader). */
export const LANDING_ANNOUNCEMENT_MAX_SLIDES = 5;

/** Lightweight icon presets — used when `imageSrc` is empty (default). */
export type LandingAnnouncementIcon =
  | "sparkles"
  | "clock"
  | "chart"
  | "graduation"
  | "bell";

export type LandingAnnouncementSlide = {
  id: string;
  /**
   * Optional CMS/CDN image. Empty/`null` → render `icon` instead (lighter default).
   * When admin CMS ships media, set this to a published URL.
   */
  imageSrc?: string | null;
  imageAlt: string;
  /** Fallback visual when no image is provided */
  icon: LandingAnnouncementIcon;
  title: string;
  caption: string;
  /** Optional deep link / external URL */
  href?: string | null;
  enabled: boolean;
};

export type LandingAnnouncementsContent = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Short label above each slide title (e.g. お知らせ) */
  slideKicker: string;
  prevLabel: string;
  nextLabel: string;
  /** Auto-advance interval in ms; 0 disables autoplay */
  autoPlayMs: number;
  slides: LandingAnnouncementSlide[];
};



export type LandingFeatureItem = {

  id: string;

  title: string;

  description: string;

  /** Lucide icon name — CMS can store string enum later */

  icon: "practice" | "assessment" | "analytics" | "materials" | "integrity" | "bilingual";

};



export type LandingFeaturesContent = {

  enabled: boolean;

  eyebrow: string;

  title: string;

  subtitle: string;

  items: LandingFeatureItem[];

};



export type LandingStep = {

  id: string;

  title: string;

  description: string;

};



export type LandingHowItWorksContent = {

  enabled: boolean;

  eyebrow: string;

  title: string;

  subtitle: string;

  steps: LandingStep[];

};



export type LandingPreviewContent = {

  enabled: boolean;

  title: string;

  subtitle: string;

  readiness: string;

  mastery: string;

  streak: string;

  weak: string;

  weakValue: string;

  readinessValue: string;

  masteryValue: string;

  streakValue: string;

};



export type LandingPlan = {

  id: string;

  name: string;

  price: string;

  period: string;

  cta: string;

  badge?: string;

  featured?: boolean;

  features: string[];

};



export type LandingPricingContent = {

  enabled: boolean;

  title: string;

  subtitle: string;

  currencyNote: string;

  plans: LandingPlan[];

};



export type LandingFaqItem = {

  id: string;

  question: string;

  answer: string;

};



export type LandingFaqContent = {

  enabled: boolean;

  title: string;

  subtitle: string;

  items: LandingFaqItem[];

};



export type LandingCtaContent = {

  enabled: boolean;

  title: string;

  subtitle: string;

  button: string;

};



export type LandingPageContent = {

  locale: LandingLocale;

  /**

   * Section order for the public landing. CMS can reorder later.

   * Hero → Announcements → Features → How it works → Preview → Pricing → FAQ → CTA.

   */

  sectionOrder: Array<

    | "hero"

    | "announcements"

    | "features"

    | "howItWorks"

    | "preview"

    | "pricing"

    | "faq"

    | "cta"

  >;

  hero: LandingHeroContent;

  announcements: LandingAnnouncementsContent;

  features: LandingFeaturesContent;

  howItWorks: LandingHowItWorksContent;

  preview: LandingPreviewContent;

  pricing: LandingPricingContent;

  faq: LandingFaqContent;

  cta: LandingCtaContent;

};


