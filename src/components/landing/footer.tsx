import { getTranslations } from "next-intl/server";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { Link } from "@/i18n/routing";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-charcoal/15 bg-[#eceae7] safe-pb">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-12 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="min-w-0">
          <BrandWordmark
            size={32}
            className="gap-2.5"
            logoClassName="h-8 w-8"
            textClassName="text-lg"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-charcoal/75">
            {t("tagline")}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">{t("product")}</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal/70">
            <li>
              <a href="#features" className="hover:text-brand">
                {nav("features")}
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-brand">
                {nav("pricing")}
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-brand">
                {nav("faq")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">{t("legal")}</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal/70">
            <li>
              <Link href="/privacy" className="hover:text-brand">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand">
                {t("terms")}
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@onigiroku.com"
                className="hover:text-brand"
              >
                {t("contact")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-charcoal/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-charcoal/60 sm:px-6 lg:px-8">
          {t("rights", { year })}
        </p>
      </div>
    </footer>
  );
}
