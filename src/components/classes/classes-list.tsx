import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Infinity as InfinityIcon,
  Layers,
  PackageOpen,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BenefitList } from "@/components/classes/benefit-list";
import { ClassPrice } from "@/components/classes/class-price";
import { ClassesToolbar } from "@/components/classes/classes-toolbar";
import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { goPublicListPackages } from "@/lib/api/go-packages";
import {
  getServerSession,
  getSessionRole,
} from "@/lib/auth/session";
import {
  loginWithBuyHref,
  registerWithBuyHref,
} from "@/lib/packages/buy-intent";
import {
  packageDescription,
  packageExcerpt,
  packageName,
} from "@/lib/packages/display";
import { packageBenefitLines } from "@/lib/packages/benefits";
import { formatDiscountPercent } from "@/lib/packages/format";
import { classesListHref } from "@/lib/packages/query";
import type { ClassPackage } from "@/lib/packages/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  page?: number;
  search?: string;
};

const PAGE_SIZE = 9;
const MAX_CARD_BENEFITS = 4;

async function resolveIsSignedIn() {
  try {
    const session = await getServerSession();
    if (!session) return false;
    const role = getSessionRole(session);
    return role === "USER" || role === "ADMIN";
  } catch {
    return false;
  }
}

export async function ClassesList({
  locale,
  page = 1,
  search = "",
}: Props) {
  const t = await getTranslations("classesPage");

  let items: ClassPackage[] = [];
  let totalPages = 1;
  let total = 0;
  let error: string | null = null;

  const [signedIn, listResult] = await Promise.all([
    resolveIsSignedIn(),
    goPublicListPackages({
      page,
      pageSize: PAGE_SIZE,
      search,
      sortBy: "position",
    }).then(
      (data) => ({ data }),
      () => ({ data: null }),
    ),
  ]);

  if (listResult.data) {
    items = listResult.data.items ?? [];
    totalPages = Math.max(1, listResult.data.totalPages);
    total = listResult.data.total;
  } else {
    error = t("errors.loadFailed");
  }

  const pageHref = (target: number) =>
    classesListHref({ search, page: target });

  return (
    <div className="relative flex flex-1 flex-col bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(230,0,18,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.9)_0%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-seigaiha opacity-[0.12]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-jp text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-[2.75rem]">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-charcoal/70 sm:text-base">
            {t("subtitle")}
          </p>
          <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-charcoal/55">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white/80 px-2.5 py-1">
              <ShieldCheck className="size-3.5 text-brand" aria-hidden />
              {t("trust.securePay")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white/80 px-2.5 py-1">
              {t("trust.oneTime")}
            </span>
          </div>
        </header>

        <div className="mx-auto mt-8 max-w-xl">
          <ClassesToolbar initialSearch={search} />
        </div>

        {error ? (
          <p className="mt-10 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[1.35rem] border border-dashed border-charcoal/15 bg-white/80 px-6 py-16 text-center shadow-sm">
            <PackageOpen className="mx-auto size-10 text-charcoal/30" aria-hidden />
            <p className="mt-4 text-base font-semibold text-ink">
              {t("empty.title")}
            </p>
            <p className="mt-1 text-sm text-charcoal/60">
              {t("empty.description")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-semibold text-ink/80">
                {t("resultCount", { count: total })}
              </p>
              <p className="text-xs font-medium text-charcoal/45">
                {t("pagination.showing", {
                  from: (page - 1) * PAGE_SIZE + 1,
                  to: Math.min(page * PAGE_SIZE, total),
                  total,
                })}
              </p>
            </div>

            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => {
                const name = packageName(item, locale);
                const description = packageExcerpt(
                  packageDescription(item, locale),
                );
                const cover = toBrowserMediaUrl(item.coverUrl);
                const benefitLines = packageBenefitLines(item, locale);
                const entitlementCount = item.entitlements?.length ?? 0;
                const checkoutHref = signedIn
                  ? `/classes/${item.slug}/checkout`
                  : registerWithBuyHref(item.slug);

                return (
                  <li
                    key={item.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <article className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_24px_48px_-24px_rgba(230,0,18,0.28)]">
                      <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[linear-gradient(145deg,#fff7f7_0%,#f4f1ea_55%,#fff_100%)]">
                            <BrandLogo size={72} alt="" />
                          </div>
                        )}
                        {item.discountActive && item.discountPercent > 0 ? (
                          <span className="absolute top-3 right-3 rounded-md bg-brand px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm">
                            {t("card.discountBadge", {
                              percent: formatDiscountPercent(
                                item.discountPercent,
                                locale,
                              ),
                            })}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <div className="space-y-1.5">
                          <h2 className="font-jp line-clamp-2 text-lg font-bold tracking-tight text-ink">
                            {name}
                          </h2>
                          {description ? (
                            <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/60">
                              {description}
                            </p>
                          ) : null}
                        </div>

                        {benefitLines.length > 0 ? (
                          <div className="space-y-1.5 rounded-xl bg-[var(--canvas)]/80 px-3 py-3">
                            <BenefitList
                              items={benefitLines}
                              limit={MAX_CARD_BENEFITS}
                              variant="compact"
                            />
                            {benefitLines.length > MAX_CARD_BENEFITS ? (
                              <p className="pl-[1.625rem] text-[11px] font-semibold text-brand">
                                {t("card.benefitsMore", {
                                  count: benefitLines.length - MAX_CARD_BENEFITS,
                                })}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-charcoal/10 bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/55">
                            <Layers className="size-3" aria-hidden />
                            {t("card.includes", { count: entitlementCount })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-charcoal/10 bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/55">
                            {item.accessDurationDays ? (
                              <Timer className="size-3" aria-hidden />
                            ) : (
                              <InfinityIcon className="size-3" aria-hidden />
                            )}
                            {item.accessDurationDays
                              ? t("card.accessDays", {
                                  days: item.accessDurationDays,
                                })
                              : t("card.accessLifetime")}
                          </span>
                        </div>

                        <div className="mt-auto space-y-3 border-t border-charcoal/8 pt-4">
                          <ClassPrice
                            pkg={item}
                            locale={locale}
                            discountLabel={t("card.discountBadge", {
                              percent: formatDiscountPercent(
                                item.discountPercent,
                                locale,
                              ),
                            })}
                            listPriceLabel={t("card.listPriceLabel")}
                          />

                          {signedIn ? (
                            <Link
                              href={checkoutHref}
                              className={cn(
                                buttonVariants({ variant: "default" }),
                                "h-11 w-full cursor-pointer gap-2 rounded-xl text-sm font-semibold shadow-sm",
                              )}
                            >
                              {t("actions.buy")}
                              <ArrowRight className="size-4" aria-hidden />
                            </Link>
                          ) : (
                            <div className="space-y-1.5">
                              <Link
                                href={registerWithBuyHref(item.slug)}
                                className={cn(
                                  buttonVariants({ variant: "default" }),
                                  "h-11 w-full cursor-pointer gap-2 rounded-xl text-sm font-semibold shadow-sm",
                                )}
                              >
                                {t("actions.registerToBuy")}
                                <ArrowRight className="size-4" aria-hidden />
                              </Link>
                              <Link
                                href={loginWithBuyHref(item.slug)}
                                className="block text-center text-xs font-semibold text-charcoal/65 hover:text-brand hover:underline"
                              >
                                {t("actions.loginAlt")}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>

            <nav
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
              aria-label={t("pagination.label")}
            >
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 cursor-pointer gap-1.5 rounded-xl px-3.5 text-sm font-semibold",
                  )}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">
                    {t("pagination.prev")}
                  </span>
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 pointer-events-none gap-1.5 rounded-xl px-3.5 text-sm font-semibold opacity-40",
                  )}
                  aria-disabled
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">
                    {t("pagination.prev")}
                  </span>
                </span>
              )}
              <span className="inline-flex min-w-[4.75rem] items-center justify-center rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-sm font-bold tabular-nums text-brand">
                {t("pagination.page", { page, total: totalPages })}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 cursor-pointer gap-1.5 rounded-xl px-3.5 text-sm font-semibold",
                  )}
                >
                  <span className="hidden sm:inline">
                    {t("pagination.next")}
                  </span>
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 pointer-events-none gap-1.5 rounded-xl px-3.5 text-sm font-semibold opacity-40",
                  )}
                  aria-disabled
                >
                  <span className="hidden sm:inline">
                    {t("pagination.next")}
                  </span>
                  <ChevronRight className="size-4" />
                </span>
              )}
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
