"use client";



import { motion, useReducedMotion } from "framer-motion";



import {

  Accordion,

  AccordionContent,

  AccordionItem,

  AccordionTrigger,

} from "@/components/ui/accordion";

import type { LandingFaqContent } from "@/content/cms/landing-types";



const EASE = [0.22, 1, 0.36, 1] as const;



type Props = {

  content: LandingFaqContent;

};



/** PRD §13.5 FAQ — Soft Gray / seigaiha band; CMS-managed Q&A */

export function LandingFaq({ content }: Props) {

  const reduceMotion = useReducedMotion();



  return (

    <section id="faq" className="relative scroll-mt-24 overflow-hidden bg-soft py-14 sm:py-20 lg:py-24">

      <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-50" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">

        <motion.div

          initial={{ opacity: 0, y: 18 }}

          whileInView={{ opacity: 1, y: 0 }}

          viewport={{ once: true, amount: 0.35 }}

          transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE }}

        >

          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-[2rem]">

            {content.title}

          </h2>

          <p className="mt-4 text-pretty text-base text-charcoal/80 sm:text-lg">

            {content.subtitle}

          </p>

        </motion.div>



        <motion.div

          initial={{ opacity: 0, y: 18 }}

          whileInView={{ opacity: 1, y: 0 }}

          viewport={{ once: true, amount: 0.2 }}

          transition={

            reduceMotion

              ? { duration: 0 }

              : { duration: 0.55, delay: 0.06, ease: EASE }

          }

        >

          <Accordion className="w-full rounded-xl border border-charcoal/10 bg-white px-2 shadow-[0_12px_32px_-28px_rgba(67,64,64,0.35)]">

            {content.items.map((item) => (

              <AccordionItem

                key={item.id}

                value={item.id}

                className="border-charcoal/10 px-3"

              >

                <AccordionTrigger className="text-left text-base font-semibold text-ink hover:no-underline">

                  {item.question}

                </AccordionTrigger>

                <AccordionContent className="text-sm leading-relaxed text-charcoal/75">

                  {item.answer}

                </AccordionContent>

              </AccordionItem>

            ))}

          </Accordion>

        </motion.div>

      </div>

    </section>

  );

}


