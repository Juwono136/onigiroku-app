import {
  BookOpen,
  ChartColumn,
  Clock3,
  Flame,
  Settings,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import type { AuthSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type Props = {
  session: AuthSession;
  locale: string;
  role: UserRole;
};

export async function DashboardHome({ session, locale, role }: Props) {
  const t = await getTranslations("dashboard");
  const label = locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id;
  const isAdmin = role === "ADMIN";

  const eyebrow = isAdmin ? t("admin.eyebrow") : t("student.eyebrow");
  const title = isAdmin
    ? t("admin.title", { name: session.user.name })
    : t("student.title", { name: session.user.name });
  const subtitle = isAdmin
    ? t("admin.subtitle", { role: label })
    : t("student.subtitle", { role: label });

  const stats = isAdmin
    ? [
        {
          icon: Sparkles,
          label: t("stats.platform"),
          value: t("stats.platformValue"),
        },
        {
          icon: ChartColumn,
          label: t("stats.ops"),
          value: t("stats.opsValue"),
        },
        {
          icon: Clock3,
          label: t("stats.session"),
          value: t("stats.sessionValue"),
        },
      ]
    : [
        {
          icon: Flame,
          label: t("stats.streak"),
          value: t("stats.streakValue"),
        },
        {
          icon: BookOpen,
          label: t("stats.trial"),
          value: t("stats.trialValue"),
        },
        {
          icon: ChartColumn,
          label: t("stats.mastery"),
          value: t("stats.masteryValue"),
        },
      ];

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-seigaiha opacity-[0.18]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/70 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-4 shadow-[0_10px_28px_-26px_rgba(67,64,64,0.55)] sm:p-5"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
                  <stat.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-ink">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid auto-rows-fr gap-4 lg:grid-cols-12">
          <section className="jp-rail rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-5 shadow-[0_14px_36px_-30px_rgba(67,64,64,0.5)] sm:p-7 lg:col-span-7 xl:col-span-8">
            <h2 className="text-lg font-bold text-ink">
              {isAdmin ? t("admin.cardTitle") : t("student.cardTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal/70">
              {isAdmin ? t("admin.cardBody") : t("student.cardBody")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:max-w-xl">
              <Link
                href="/settings"
                className={cn(
                  buttonVariants(),
                  "h-11 cursor-pointer justify-start gap-2 rounded-xl px-4 font-semibold",
                )}
              >
                <Settings className="size-4" aria-hidden />
                {t("actions.settings")}
              </Link>
              <Link
                href="/#features"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 cursor-pointer justify-start gap-2 rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)] px-4 font-semibold",
                )}
              >
                <BookOpen className="size-4" aria-hidden />
                {t("actions.explore")}
              </Link>
            </div>
          </section>

          <aside className="overflow-hidden rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] shadow-[0_14px_36px_-30px_rgba(67,64,64,0.5)] lg:col-span-5 xl:col-span-4">
            <div
              className="h-10 border-b border-charcoal/8 bg-[var(--workspace-surface)] bg-asanoha opacity-80"
              aria-hidden
            />
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("account.title")}</h2>
              <p className="mt-1 text-sm text-charcoal/65">{t("account.subtitle")}</p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                    {t("labels.name")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-ink">
                    {session.user.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                    {t("labels.email")}
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium text-ink">
                    {session.user.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                    {t("labels.role")}
                  </dt>
                  <dd className="mt-1">
                    <span className="inline-flex rounded-full bg-brand/12 px-2.5 py-1 text-xs font-semibold text-brand">
                      {label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-charcoal/50 uppercase">
                    {t("labels.verified")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-ink">
                    {session.user.emailVerified
                      ? t("account.verifiedYes")
                      : t("account.verifiedNo")}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
