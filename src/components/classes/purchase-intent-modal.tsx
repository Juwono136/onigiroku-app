"use client";

import { ArrowRight, Loader2, PackageX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { BenefitList } from "@/components/classes/benefit-list";
import { ClassPrice } from "@/components/classes/class-price";
import { EntitlementList } from "@/components/classes/entitlement-list";
import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { packageBenefitLines } from "@/lib/packages/benefits";
import {
  checkoutPath,
  clearBuyIntentCookie,
  parseBuySlug,
  readBuyIntentCookie,
  writeBuyIntentCookie,
} from "@/lib/packages/buy-intent";
import {
  entitlementTypeKey,
  packageName,
} from "@/lib/packages/display";
import type { ClassPackage } from "@/lib/packages/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  /** Raw `?buy=` value read on the server (dashboard searchParams). */
  buySlug?: string | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; pkg: ClassPackage }
  | { status: "notFound" }
  | { status: "error" };

const MAX_PREVIEW_ITEMS = 4;
const MAX_MODAL_BENEFITS = 4;

/**
 * Post-auth buy intent. Opens when `?buy={slug}` is present (or the short-lived
 * `buy_intent` cookie survives a refresh), strips `buy` from the URL, and
 * offers a single "Continue to checkout" action.
 */
export function PurchaseIntentModal({ buySlug }: Props) {
  const t = useTranslations("classesPage");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  // Server-provided slug opens the modal immediately (same value on hydrate).
  const [slug, setSlug] = useState<string | null>(() => parseBuySlug(buySlug));
  const [result, setResult] = useState<{
    slug: string;
    state: Exclude<LoadState, { status: "loading" }>;
  } | null>(null);
  const cookieChecked = useRef(false);

  // Persist the intent, strip `buy` from the URL, or fall back to the cookie.
  useEffect(() => {
    const fromUrl = parseBuySlug(buySlug);
    let frame = 0;
    if (fromUrl) {
      cookieChecked.current = true;
      writeBuyIntentCookie(fromUrl);
      const params = new URLSearchParams(window.location.search);
      params.delete("buy");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      frame = requestAnimationFrame(() => setSlug(fromUrl));
    } else if (!cookieChecked.current) {
      cookieChecked.current = true;
      const fromCookie = readBuyIntentCookie();
      if (fromCookie) frame = requestAnimationFrame(() => setSlug(fromCookie));
    }
    return () => cancelAnimationFrame(frame);
  }, [buySlug, pathname, router]);

  // Load the package for the active intent.
  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    const finish = (state: Exclude<LoadState, { status: "loading" }>) =>
      setResult({ slug, state });
    fetch(`/api/classes/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (res.status === 404) {
          finish({ status: "notFound" });
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          data?: ClassPackage;
        } | null;
        if (!res.ok || !json?.success || !json.data) {
          finish({ status: "error" });
          return;
        }
        finish({ status: "ready", pkg: json.data });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        finish({ status: "error" });
      });
    return () => controller.abort();
  }, [slug]);

  const state: LoadState =
    result && result.slug === slug ? result.state : { status: "loading" };

  function dismiss() {
    clearBuyIntentCookie();
    setSlug(null);
  }

  const open = slug !== null;
  const pkg = state.status === "ready" ? state.pkg : null;
  const entitlements = pkg?.entitlements ?? [];
  const previewItems = entitlements.slice(0, MAX_PREVIEW_ITEMS);
  const hiddenCount = entitlements.length - previewItems.length;
  const cover = pkg ? toBrowserMediaUrl(pkg.coverUrl) : null;
  const benefitLines = pkg ? packageBenefitLines(pkg, locale) : [];
  const hiddenBenefits = Math.max(0, benefitLines.length - MAX_MODAL_BENEFITS);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b border-charcoal/8 bg-[var(--workspace-surface)] px-5 py-4 pr-12 sm:px-6">
          <p className="text-[10px] font-bold tracking-[0.16em] text-brand uppercase">
            {t("modal.eyebrow")}
          </p>
          <DialogTitle className="mt-1 text-lg font-bold tracking-tight text-ink sm:text-xl">
            {state.status === "notFound" || state.status === "error"
              ? t("modal.errorTitle")
              : t("modal.title")}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-snug text-charcoal/65">
            {state.status === "notFound"
              ? t("modal.errorBody")
              : state.status === "error"
                ? t("modal.errorGeneric")
                : t("modal.description")}
          </DialogDescription>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {state.status === "loading" ? (
            <p
              className="flex items-center gap-2 py-6 text-sm font-medium text-charcoal/60"
              role="status"
            >
              <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
              {t("modal.loading")}
            </p>
          ) : null}

          {state.status === "notFound" || state.status === "error" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-charcoal/[0.06] text-charcoal/50">
                <PackageX className="size-5" aria-hidden />
              </span>
              <Link
                href="/classes"
                onClick={dismiss}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-10 cursor-pointer gap-2 rounded-xl px-5 font-semibold",
                )}
              >
                {t("modal.browse")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ) : null}

          {pkg ? (
            <div className="space-y-5">
              <div className="flex gap-3.5">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-charcoal/10 bg-soft sm:size-20">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[var(--workspace-surface)]">
                      <BrandLogo size={36} alt="" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h3 className="font-jp line-clamp-2 text-base font-bold leading-snug tracking-tight text-ink">
                    {packageName(pkg, locale)}
                  </h3>
                  <ClassPrice
                    pkg={pkg}
                    locale={locale}
                    discountLabel={t("card.discountBadge", {
                      percent: pkg.discountPercent,
                    })}
                    listPriceLabel={t("card.listPriceLabel")}
                  />
                  <p className="text-xs font-medium text-charcoal/55">
                    {pkg.accessDurationDays
                      ? t("card.accessDays", { days: pkg.accessDurationDays })
                      : t("card.accessLifetime")}
                  </p>
                </div>
              </div>

              {benefitLines.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-brand/15 bg-brand/[0.035] p-3.5">
                  <h4 className="text-[10px] font-bold tracking-[0.14em] text-brand uppercase">
                    {t("modal.benefitsTitle")}
                  </h4>
                  <BenefitList
                    items={benefitLines}
                    limit={MAX_MODAL_BENEFITS}
                    variant="panel"
                  />
                  {hiddenBenefits > 0 ? (
                    <p className="text-xs font-medium text-charcoal/55">
                      {t("modal.moreBenefits", { count: hiddenBenefits })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {previewItems.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                    {t("modal.includesTitle")}
                  </h4>
                  <EntitlementList
                    entitlements={previewItems}
                    typeLabel={(type) =>
                      t(`entitlements.types.${entitlementTypeKey(type)}`)
                    }
                    allLabel={t("entitlements.all")}
                  />
                  {hiddenCount > 0 ? (
                    <p className="text-xs font-medium text-charcoal/55">
                      {t("modal.moreItems", { count: hiddenCount })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={dismiss}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 cursor-pointer rounded-xl border-charcoal/15 px-5 font-semibold",
                  )}
                >
                  {t("modal.later")}
                </button>
                <Link
                  href={checkoutPath(pkg.slug)}
                  onClick={clearBuyIntentCookie}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-11 cursor-pointer gap-2 rounded-xl px-5 font-semibold",
                  )}
                >
                  {t("modal.continue")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
