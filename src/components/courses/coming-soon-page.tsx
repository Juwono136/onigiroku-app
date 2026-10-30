import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
};

export function ComingSoonPage({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref = "/learning-path",
}: Props) {
  return (
    <div className="relative flex flex-1 flex-col bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-hero-mesh"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-charcoal/70">
          {description}
        </p>
        <Link
          href={ctaHref}
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-8 h-11 cursor-pointer gap-2 rounded-xl px-6 font-semibold",
          )}
        >
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
