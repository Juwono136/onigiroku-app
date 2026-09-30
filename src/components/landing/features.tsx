"use client";



import { motion, useReducedMotion } from "framer-motion";

import {

  BarChart3,

  BookOpen,

  Languages,

  ShieldCheck,

  Target,

  Timer,

} from "lucide-react";



import type { LandingFeaturesContent } from "@/content/cms/landing-types";



const ICONS = {

  practice: BookOpen,

  assessment: Timer,

  analytics: BarChart3,

  materials: Target,

  integrity: ShieldCheck,

  bilingual: Languages,

} as const;



const EASE = [0.22, 1, 0.36, 1] as const;



type Props = {

  content: LandingFeaturesContent;

};



/** PRD §13.5 capabilities — Soft Gray / washi band, rice-white cards */

export function LandingFeatures({ content }: Props) {

  const reduceMotion = useReducedMotion();



  return (

    <section id="features" className="relative scroll-mt-24 overflow-hidden bg-soft py-14 sm:py-20 lg:py-24">

      <div className="pointer-events-none absolute inset-0 bg-asanoha opacity-70" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          whileInView={{ opacity: 1, y: 0 }}

          viewport={{ once: true, amount: 0.3 }}

          transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE }}

          className="mx-auto max-w-2xl text-center"

        >

          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand uppercase">

            {content.eyebrow}

          </p>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-[2rem]">

            {content.title}

          </h2>

          <p className="mt-4 text-pretty text-base text-charcoal/80 sm:text-lg">

            {content.subtitle}

          </p>

        </motion.div>



        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {content.items.map((feature, index) => {

            const Icon = ICONS[feature.icon] ?? BookOpen;

            return (

              <motion.article

                key={feature.id}

                initial={{ opacity: 0, y: 18 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, margin: "-40px" }}

                transition={

                  reduceMotion

                    ? { duration: 0 }

                    : { duration: 0.5, delay: index * 0.05, ease: EASE }

                }

                whileHover={reduceMotion ? undefined : { y: -4 }}

                className="group rounded-xl border border-charcoal/10 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(67,64,64,0.4)] transition-shadow duration-300 hover:border-brand/25 hover:shadow-[0_18px_40px_-28px_rgba(230,0,18,0.35)]"

              >

                <div className="mb-3 inline-flex size-10 items-center justify-center rounded-[10px] bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">

                  <Icon className="size-5" aria-hidden />

                </div>

                <h3 className="text-base font-semibold text-ink">

                  {feature.title}

                </h3>

                <p className="mt-2 text-sm leading-relaxed text-charcoal/75">

                  {feature.description}

                </p>

              </motion.article>

            );

          })}

        </div>

      </div>

    </section>

  );

}


