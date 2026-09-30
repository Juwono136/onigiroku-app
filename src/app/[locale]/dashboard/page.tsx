import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/landing/footer";
import { requireRole } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole("USER", { locale });
  const t = await getTranslations("dashboard");
  const roleLabel =
    locale === "en" ? ROLE_LABELS.USER.en : ROLE_LABELS.USER.id;

  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 flex-col bg-hero-mesh">
        <div className="pointer-events-none absolute inset-0 bg-seigaiha opacity-40" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
                {t("student.eyebrow")}
              </p>
              <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t("student.title", { name: session.user.name })}
              </h1>
              <p className="mt-2 text-sm text-charcoal/75">
                {t("student.subtitle", { role: roleLabel })}
              </p>
            </div>
            <SignOutButton />
          </div>

          <div className="rounded-2xl border border-charcoal/10 bg-white/95 p-6 shadow-[0_16px_40px_-32px_rgba(67,64,64,0.4)] sm:p-8">
            <h2 className="text-lg font-bold text-ink">{t("student.cardTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
              {t("student.cardBody")}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                  {t("labels.email")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {session.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                  {t("labels.role")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">{roleLabel}</dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
