"use client";



import { motion, useReducedMotion } from "framer-motion";

import { Check } from "lucide-react";



import { buttonVariants } from "@/components/ui/button";

import type { LandingPricingContent } from "@/content/cms/landing-types";

import { Link } from "@/i18n/routing";

import { cn } from "@/lib/utils";



const EASE = [0.22, 1, 0.36, 1] as const;



type Props = {

  content: LandingPricingContent;

};



/** PRD §13.5 pricing — canvas background, rice-white cards */

export function LandingPricing({ content }: Props) {

  const reduceMotion = useReducedMotion();



  return (

    <section id="pricing" className="relative scroll-mt-24 overflow-hidden bg-canvas py-14 sm:py-20 lg:py-24">

      <div className="pointer-events-none absolute inset-0 bg-asanoha opacity-50" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

        <motion.div

          initial={{ opacity: 0, y: 18 }}

          whileInView={{ opacity: 1, y: 0 }}

          viewport={{ once: true, amount: 0.35 }}

          transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE }}

          className="mx-auto max-w-2xl text-center"

        >

          <h2 className="text-balance text-3xl font-bold tracking-tight text-ink sm:text-[2rem]">

            {content.title}

          </h2>

          <p className="mt-4 text-pretty text-base text-charcoal/80 sm:text-lg">

            {content.subtitle}

          </p>

          <p className="mt-2 text-sm text-charcoal/60">{content.currencyNote}</p>

        </motion.div>



        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">

          {content.plans.map((plan, index) => (

            <motion.article

              key={plan.id}

              initial={{ opacity: 0, y: 20 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true, margin: "-40px" }}

              transition={

                reduceMotion

                  ? { duration: 0 }

                  : { duration: 0.5, delay: index * 0.08, ease: EASE }

              }

              className={cn(

                "relative rounded-xl border bg-white p-6 shadow-[0_14px_36px_-30px_rgba(67,64,64,0.45)]",

                plan.featured

                  ? "border-2 border-brand shadow-[0_20px_48px_-28px_rgba(230,0,18,0.45)]"

                  : "border-charcoal/10",

              )}

            >

              {plan.badge ? (

                <span className="absolute -top-3 left-5 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">

                  {plan.badge}

                </span>

              ) : null}

              <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>

              <p className="mt-3 flex items-baseline gap-1">

                <span className="text-3xl font-bold tracking-tight text-ink">

                  {plan.price}

                </span>

                <span className="text-sm text-charcoal/60">{plan.period}</span>

              </p>

              <ul className="mt-5 space-y-2.5">

                {plan.features.map((feature) => (

                  <li

                    key={feature}

                    className="flex gap-2 text-sm text-charcoal/85"

                  >

                    <Check

                      className={cn(

                        "mt-0.5 size-4 shrink-0",

                        plan.featured ? "text-brand" : "text-success",

                      )}

                    />

                    {feature}

                  </li>

                ))}

              </ul>

              <Link

                href="/register"

                className={cn(

                  buttonVariants({

                    variant: plan.featured ? "default" : "outline",

                  }),

                  "mt-7 h-10 w-full rounded-xl font-semibold transition-transform duration-300 hover:-translate-y-0.5",

                )}

              >

                {plan.cta}

              </Link>

            </motion.article>

          ))}

        </div>

      </div>

    </section>

  );

}


