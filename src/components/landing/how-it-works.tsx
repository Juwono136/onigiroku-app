"use client";



import { motion, useReducedMotion } from "framer-motion";



import type { LandingHowItWorksContent } from "@/content/cms/landing-types";



const EASE = [0.22, 1, 0.36, 1] as const;



type Props = {

  content: LandingHowItWorksContent;

};



/** PRD §13.5 how it works — washi / seigaiha atmospheric band */

export function LandingHowItWorks({ content }: Props) {

  const reduceMotion = useReducedMotion();



  return (

    <section

      id="how-it-works"

      className="relative scroll-mt-24 overflow-hidden border-y border-charcoal/10 bg-washi py-14 sm:py-20 lg:py-24"

    >

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



        <ol className="relative mt-12 grid gap-4 lg:grid-cols-3">

          <div className="pointer-events-none absolute top-9 right-[14%] left-[14%] hidden h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent lg:block" />

          {content.steps.map((step, index) => (

            <motion.li

              key={step.id}

              initial={{ opacity: 0, y: 18 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true, margin: "-40px" }}

              transition={

                reduceMotion

                  ? { duration: 0 }

                  : { duration: 0.5, delay: index * 0.08, ease: EASE }

              }

              className="relative rounded-xl border border-charcoal/10 bg-white/95 p-6 shadow-[0_12px_32px_-28px_rgba(67,64,64,0.4)] backdrop-blur-sm"

            >

              <span className="mb-4 inline-flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(230,0,18,0.7)]">

                {index + 1}

              </span>

              <h3 className="text-base font-semibold text-ink">{step.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-charcoal/75">

                {step.description}

              </p>

            </motion.li>

          ))}

        </ol>

      </div>

    </section>

  );

}


