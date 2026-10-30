import { ArrowRight, BookOpen, Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/shared/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { goPublicPopularCourses } from "@/lib/api/go-learning";
import { plainExcerpt } from "@/lib/learning/rich-text";
import type { LearningCategory } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
};

function cardExcerpt(raw: string, max = 140) {
  const text = plainExcerpt(raw);
  if (text.length <= max) return text;
  const slice = text.slice(0, max).replace(/\s+\S*$/, "").trim();
  return `${slice || text.slice(0, max)}…`;
}

export async function LandingPopularCourses({ locale }: Props) {
  const t = await getTranslations("landingCourses");

  let items: LearningCategory[] = [];
  try {
    items = await goPublicPopularCourses(3);
  } catch {
    return null;
  }

  if (items.length === 0) return null;

  return (
    <section
      id="learning-path"
      className="relative scroll-mt-24 border-b border-charcoal/8 bg-canvas py-14 sm:py-16 lg:py-20"
      aria-labelledby="landing-learning-path-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-seigaiha opacity-[0.1]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
              {t("eyebrow")}
            </p>
            <h2
              id="landing-learning-path-heading"
              className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {t("title")}
            </h2>
            <p className="text-sm leading-relaxed text-charcoal/70 sm:text-base">
              {t("subtitle")}
            </p>
          </div>
          <Link
            href="/learning-path"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 shrink-0 cursor-pointer gap-2 rounded-xl border-charcoal/15 px-5 font-semibold hover:border-brand/30 hover:text-brand",
            )}
          >
            {t("viewAll")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const name =
              locale === "en" ? item.nameEn || item.nameId : item.nameId;
            const description = cardExcerpt(
              locale === "en"
                ? item.descriptionEn || item.descriptionId
                : item.descriptionId,
            );
            const cover = toBrowserMediaUrl(item.coverUrl);
            const views = item.studentViewCount ?? 0;

            return (
              <li
                key={item.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Link
                  href={`/learning-path/${item.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_16px_36px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_22px_48px_-28px_rgba(185,28,28,0.25)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-soft">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-[var(--workspace-surface)]">
                        <BrandLogo size={64} alt="" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand uppercase shadow-sm backdrop-blur">
                      <BookOpen className="size-3" aria-hidden />
                      {t("lessons", { count: item.lessonCount })}
                    </span>
                    {views > 0 ? (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                        <Flame className="size-3 text-brand" aria-hidden />
                        {t("popular")}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h3 className="font-jp text-lg font-bold tracking-tight text-ink group-hover:text-brand">
                      {name}
                    </h3>
                    {description ? (
                      <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/65">
                        {description}
                      </p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand">
                      {t("viewDetail")}
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
