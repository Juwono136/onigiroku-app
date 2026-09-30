"use client";

import { useTranslations } from "next-intl";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { Link } from "@/i18n/routing";
import { getDashboardPath, type UserRole } from "@/lib/auth/roles";

type Props = {
  role: UserRole;
};

export function AppFooter({ role }: Props) {
  const t = useTranslations("appShell");
  const year = new Date().getFullYear();
  const homeHref = getDashboardPath(role);

  return (
    <footer className="relative mt-auto border-t border-charcoal/10 bg-[var(--workspace-footer)]">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-1.5">
          <BrandWordmark
            href={homeHref}
            size={28}
            textClassName="text-sm"
            className="w-fit"
          />
          <p className="max-w-sm text-xs leading-relaxed text-charcoal/60">
            {t("footer.tagline")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-charcoal/65">
          <Link
            href="/privacy"
            className="cursor-pointer transition-colors hover:text-brand"
          >
            {t("footer.privacy")}
          </Link>
          <Link
            href="/terms"
            className="cursor-pointer transition-colors hover:text-brand"
          >
            {t("footer.terms")}
          </Link>
          <Link
            href="/#faq"
            className="cursor-pointer transition-colors hover:text-brand"
          >
            {t("footer.help")}
          </Link>
        </div>
      </div>
      <div className="relative border-t border-charcoal/10 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] text-charcoal/45 sm:text-left">
          {t("footer.copyright", { year })}
        </p>
      </div>
    </footer>
  );
}
