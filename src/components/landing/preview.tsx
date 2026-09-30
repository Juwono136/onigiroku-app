"use client";



import { motion, useReducedMotion } from "framer-motion";



import type { LandingPreviewContent } from "@/content/cms/landing-types";



const EASE = [0.22, 1, 0.36, 1] as const;



type Props = {

  content: LandingPreviewContent;

};



/** PRD §13.5 sample preview — white surface on canvas with JP texture */

export function LandingPreview({ content }: Props) {

  const reduceMotion = useReducedMotion();



  return (

    <section className="relative scroll-mt-24 overflow-hidden bg-white py-14 sm:py-20 lg:py-24">

      <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-40" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">

        <motion.div

          initial={{ opacity: 0, y: 18 }}

          whileInView={{ opacity: 1, y: 0 }}

          viewport={{ once: true, amount: 0.35 }}

          transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE }}

        >

          <p className="mb-3 font-jp text-xs font-semibold tracking-[0.16em] text-brand">

            進捗を見える化

          </p>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-[2rem]">

            {content.title}

          </h2>

          <p className="mt-4 max-w-md text-pretty text-base text-charcoal/80 sm:text-lg">

            {content.subtitle}

          </p>

        </motion.div>



        <motion.div

          initial={{ opacity: 0, x: 24 }}

          whileInView={{ opacity: 1, x: 0 }}

          viewport={{ once: true, margin: "-60px" }}

          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: EASE }}

          className="jp-rail rounded-xl border border-charcoal/10 bg-canvas p-5 shadow-[0_20px_48px_-36px_rgba(67,64,64,0.45)]"

        >

          <div className="grid gap-3 sm:grid-cols-2">

            <Metric

              label={content.readiness}

              value={content.readinessValue}

              suffix="%"

              accent

            />

            <Metric

              label={content.mastery}

              value={content.masteryValue}

              suffix="%"

            />

            <Metric

              label={content.streak}

              value={content.streakValue}

              suffix="d"

            />

            <div className="rounded-xl border border-charcoal/10 bg-white p-4">

              <p className="text-xs font-medium tracking-wide text-charcoal/55 uppercase">

                {content.weak}

              </p>

              <p className="font-jp mt-2 text-base font-semibold text-ink">

                {content.weakValue}

              </p>

            </div>

          </div>

        </motion.div>

      </div>

    </section>

  );

}



function Metric({

  label,

  value,

  suffix,

  accent,

}: {

  label: string;

  value: string;

  suffix: string;

  accent?: boolean;

}) {

  return (

    <div className="rounded-xl border border-charcoal/10 bg-white p-4">

      <p className="text-xs font-medium tracking-wide text-charcoal/55 uppercase">

        {label}

      </p>

      <p

        className={`mt-2 text-3xl font-bold tracking-tight ${accent ? "text-brand" : "text-ink"}`}

      >

        {value}

        <span className="ml-0.5 text-lg font-semibold text-charcoal/50">

          {suffix}

        </span>

      </p>

    </div>

  );

}


