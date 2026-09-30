import { setRequestLocale } from "next-intl/server";



import { LandingAnnouncements } from "@/components/landing/announcements";

import { LandingCta } from "@/components/landing/cta";

import { LandingFaq } from "@/components/landing/faq";

import { LandingFeatures } from "@/components/landing/features";

import { SiteFooter } from "@/components/landing/footer";

import { LandingHero } from "@/components/landing/hero";

import { LandingHowItWorks } from "@/components/landing/how-it-works";

import { LandingPreview } from "@/components/landing/preview";

import { LandingPricing } from "@/components/landing/pricing";

import { SiteHeader } from "@/components/layout/site-header";

import { getLandingPageContent } from "@/content/cms/get-landing-content";

import type { LandingLocale } from "@/content/cms/landing-types";



export default async function HomePage({

  params,

}: {

  params: Promise<{ locale: string }>;

}) {

  const { locale } = await params;

  setRequestLocale(locale);



  const content = await getLandingPageContent(locale as LandingLocale);



  return (

    <>

      <SiteHeader />

      {/* PRD §13.2: Warm Canvas as application background — not pure white */}

      <main className="flex-1 bg-canvas">

        {content.hero.enabled ? <LandingHero content={content.hero} /> : null}

        {content.announcements.enabled ? (

          <LandingAnnouncements content={content.announcements} />

        ) : null}

        {content.features.enabled ? (

          <LandingFeatures content={content.features} />

        ) : null}

        {content.howItWorks.enabled ? (

          <LandingHowItWorks content={content.howItWorks} />

        ) : null}

        {content.preview.enabled ? (

          <LandingPreview content={content.preview} />

        ) : null}

        {content.pricing.enabled ? (

          <LandingPricing content={content.pricing} />

        ) : null}

        {content.faq.enabled ? <LandingFaq content={content.faq} /> : null}

        {content.cta.enabled ? <LandingCta content={content.cta} /> : null}

      </main>

      <SiteFooter />

    </>

  );

}


