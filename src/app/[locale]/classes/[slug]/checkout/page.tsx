import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { BenefitList } from "@/components/classes/benefit-list";
import { CheckoutPayButton } from "@/components/classes/checkout-pay-button";
import { EntitlementList } from "@/components/classes/entitlement-list";
import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { goPublicGetPackage } from "@/lib/api/go-packages";
import {
  getSessionUser,
  requireAnyRole,
} from "@/lib/auth/session";
import { packageBenefitLines } from "@/lib/packages/benefits";
import { parseBuySlug } from "@/lib/packages/buy-intent";
import {
  entitlementTypeKey,
  packageDescription,
  packageName,
  packagePriceBreakdown,
} from "@/lib/packages/display";
import { formatDiscountPercent, formatIdr } from "@/lib/packages/format";
import type { ClassPackage } from "@/lib/packages/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

async function loadPackage(rawSlug: string): Promise<ClassPackage> {
  const slug = parseBuySlug(rawSlug);
  if (!slug) notFound();
  try {
    return await goPublicGetPackage(slug);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NOT_FOUND")) {
      notFound();
    }
    // Let the route error boundary render a retryable state.
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "classesPage" });
  return {
    title: t("meta.checkoutTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ClassCheckoutPage({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);

  const slug = parseBuySlug(rawSlug);
  if (!slug) notFound();

  const session = await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: `/classes/${slug}/checkout`,
  });
  const user = getSessionUser(session);

  const pkg = await loadPackage(slug);
  const t = await getTranslations("classesPage");

  const name = packageName(pkg, locale);
  const description = packageDescription(pkg, locale);
  const cover = toBrowserMediaUrl(pkg.coverUrl);
  const price = packagePriceBreakdown(pkg);
  const entitlements = pkg.entitlements ?? [];
  const benefitLines = packageBenefitLines(pkg, locale);

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

          <div className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <Link
              href="/classes"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mb-6 h-10 cursor-pointer gap-2 rounded-xl border-charcoal/15 bg-white/90 px-3.5 text-sm font-semibold text-charcoal/75 shadow-sm backdrop-blur hover:border-brand/25 hover:text-brand",
              )}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              {t("actions.backToList")}
            </Link>

            <header className="mb-6 space-y-1">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                {t("checkout.eyebrow")}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t("checkout.title")}
              </h1>
              <p className="max-w-xl text-sm leading-snug text-charcoal/60">
                {t("checkout.subtitle")}
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,22rem)] lg:items-start">
              <section
                aria-labelledby="checkout-summary-title"
                className="min-w-0 overflow-hidden rounded-[1.25rem] border border-charcoal/10 bg-white shadow-[0_22px_48px_-34px_rgba(15,23,42,0.4)]"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="aspect-[16/7] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/7] w-full items-center justify-center bg-[var(--workspace-surface)]">
                    <BrandLogo size={72} alt="" />
                  </div>
                )}
                <div className="space-y-5 p-5 sm:p-7">
                  <div className="space-y-1.5">
                    <p
                      id="checkout-summary-title"
                      className="text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase"
                    >
                      {t("checkout.summaryTitle")}
                    </p>
                    <h2 className="font-jp text-xl font-bold tracking-tight text-ink sm:text-2xl">
                      {name}
                    </h2>
                    {description ? (
                      <p className="line-clamp-4 text-sm leading-relaxed text-charcoal/65">
                        {description}
                      </p>
                    ) : null}
                  </div>

                  <dl className="flex flex-wrap items-center gap-x-2 text-sm">
                    <dt className="font-semibold text-charcoal/55">
                      {t("checkout.access")}:
                    </dt>
                    <dd className="font-semibold text-ink">
                      {pkg.accessDurationDays
                        ? t("checkout.accessDays", {
                            days: pkg.accessDurationDays,
                          })
                        : t("checkout.accessLifetime")}
                    </dd>
                  </dl>

                  {benefitLines.length > 0 ? (
                    <div className="space-y-3 rounded-2xl border border-brand/15 bg-brand/[0.035] p-4">
                      <h3 className="text-[10px] font-bold tracking-[0.14em] text-brand uppercase">
                        {t("checkout.benefitsTitle")}
                      </h3>
                      <BenefitList items={benefitLines} variant="full" />
                    </div>
                  ) : null}

                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                      {t("checkout.includesTitle")}
                    </h3>
                    {entitlements.length > 0 ? (
                      <EntitlementList
                        entitlements={entitlements}
                        typeLabel={(type) =>
                          t(`entitlements.types.${entitlementTypeKey(type)}`)
                        }
                        allLabel={t("entitlements.all")}
                      />
                    ) : (
                      <p className="text-sm text-charcoal/55">
                        {t("checkout.noEntitlements")}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="min-w-0 lg:sticky lg:top-24">
                <div className="rounded-[1.25rem] border border-charcoal/10 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] sm:p-6">
                  <h2 className="text-lg font-bold tracking-tight text-ink">
                    {t("checkout.breakdown.title")}
                  </h2>

                  <dl className="mt-4 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-charcoal/65">
                        {t("checkout.breakdown.base")}
                      </dt>
                      <dd className="font-semibold text-ink tabular-nums">
                        {formatIdr(price.base, locale)}
                      </dd>
                    </div>
                    {price.discounted ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-brand">
                          {t("checkout.breakdown.discount", {
                            percent: formatDiscountPercent(
                              price.discountPercent,
                              locale,
                            ),
                          })}
                        </dt>
                        <dd className="font-semibold text-brand tabular-nums">
                          −{formatIdr(price.discountAmount, locale)}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-3 border-t border-charcoal/10 pt-3">
                      <dt className="font-bold text-ink">
                        {t("checkout.breakdown.total")}
                      </dt>
                      <dd className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                        {formatIdr(price.total, locale)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-1.5 text-[11px] text-charcoal/45">
                    {t("checkout.breakdown.currency")}
                  </p>

                  <div className="mt-5">
                    <CheckoutPayButton
                      slug={slug}
                      totalLabel={formatIdr(price.total, locale)}
                    />
                  </div>

                  <p className="mt-4 flex gap-2 text-xs leading-relaxed text-charcoal/55">
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-brand"
                      aria-hidden
                    />
                    {t("checkout.secureNote")}
                  </p>
                  <p className="mt-3 border-t border-charcoal/8 pt-3 text-xs text-charcoal/45">
                    {t("checkout.signedInAs", { email: user.email })}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
