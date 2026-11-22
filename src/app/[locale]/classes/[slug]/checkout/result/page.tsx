import { ArrowRight, BookOpen, Hourglass, LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { goPublicGetPackage } from "@/lib/api/go-packages";
import { requireAnyRole } from "@/lib/auth/session";
import { parseBuySlug } from "@/lib/packages/buy-intent";
import { packageName } from "@/lib/packages/display";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "classesPage" });
  return {
    title: t("meta.resultTitle"),
    robots: { index: false, follow: false },
  };
}

/**
 * Landing page after DOKU. The webhook grants access asynchronously, so we
 * never claim "paid" here — only that confirmation is in progress.
 */
export default async function ClassCheckoutResultPage({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);

  const slug = parseBuySlug(rawSlug);
  if (!slug) notFound();

  await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: `/classes/${slug}/checkout/result`,
  });

  const t = await getTranslations("classesPage");

  let className: string | null = null;
  try {
    className = packageName(await goPublicGetPackage(slug), locale);
  } catch {
    // Package may have been unpublished after purchase; the result still stands.
  }

  const steps = [t("result.step1"), t("result.step2"), t("result.step3")];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <div className="relative flex flex-1 flex-col bg-[var(--background)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-hero-mesh"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-seigaiha opacity-[0.12]"
            aria-hidden
          />

          <div className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
            <div className="path-card p-6 pl-7 sm:p-9 sm:pl-11">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Hourglass className="size-6" aria-hidden />
              </span>
              <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                {t("result.eyebrow")}
              </p>
              <h1
                className="mt-1.5 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl"
                role="status"
              >
                {t("result.title")}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/70 sm:text-base">
                {t("result.body")}
              </p>

              {className ? (
                <p className="mt-4 text-sm text-charcoal/60">
                  {t("result.packageLabel")}:{" "}
                  <span className="font-jp font-semibold text-ink">
                    {className}
                  </span>
                </p>
              ) : null}

              <div className="mt-6 rounded-xl border border-charcoal/10 bg-[var(--canvas)]/70 p-4">
                <h2 className="text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                  {t("result.stepsTitle")}
                </h2>
                <ol className="mt-3 space-y-2.5">
                  {steps.map((label, index) => (
                    <li key={label} className="flex items-start gap-3 text-sm">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 leading-snug text-ink/85">
                        {label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/dashboard/materials"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-11 flex-1 cursor-pointer gap-2 rounded-xl font-semibold",
                  )}
                >
                  <BookOpen className="size-4" aria-hidden />
                  {t("actions.goMaterials")}
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 flex-1 cursor-pointer gap-2 rounded-xl border-charcoal/15 font-semibold",
                  )}
                >
                  <LayoutDashboard className="size-4" aria-hidden />
                  {t("actions.goDashboard")}
                </Link>
              </div>

              <div className="mt-6 flex flex-col gap-2 border-t border-charcoal/8 pt-5 text-sm text-charcoal/60 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {t("result.notPaid")}{" "}
                  <Link
                    href={`/classes/${slug}/checkout`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {t("result.retryCheckout")}
                  </Link>
                </p>
                <Link
                  href="/classes"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  {t("actions.browseClasses")}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
