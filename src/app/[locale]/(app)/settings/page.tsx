import { getTranslations, setRequestLocale } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { getDashboardPath, ROLE_LABELS } from "@/lib/auth/roles";
import {
  getSessionRole,
  requireSession,
} from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession({
    locale,
    callbackPath: "/settings",
  });
  const t = await getTranslations("settings");
  const role = getSessionRole(session);
  const roleLabel =
    locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id;

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-seigaiha opacity-[0.16]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-charcoal/70">{t("subtitle")}</p>
        </div>

        <section className="jp-rail rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-5 shadow-[0_14px_36px_-30px_rgba(67,64,64,0.5)] sm:p-7">
          <h2 className="text-lg font-bold text-ink">{t("profileTitle")}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                {t("fields.name")}
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {session.user.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                {t("fields.email")}
              </dt>
              <dd className="mt-1 break-all text-sm font-medium text-ink">
                {session.user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                {t("fields.role")}
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">{roleLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                {t("fields.locale")}
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink uppercase">
                {locale}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-charcoal/65">
            {t("comingSoon")}
          </p>
          <Link
            href={getDashboardPath(role)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-5 h-10 cursor-pointer rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)] font-semibold",
            )}
          >
            {t("backToDashboard")}
          </Link>
        </section>
      </div>
    </div>
  );
}
