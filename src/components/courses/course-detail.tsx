import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Flame,
  Lock,
  LogIn,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/shared/brand-logo";
import { RichTextView } from "@/components/learning/rich-text-view";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { PublicCourseDetail } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  course: PublicCourseDetail;
  locale: string;
  isStudent: boolean;
};

export async function CourseDetail({ course, locale, isStudent }: Props) {
  const t = await getTranslations("courses");
  const name =
    locale === "en" ? course.nameEn || course.nameId : course.nameId;
  const description =
    locale === "en"
      ? course.descriptionEn || course.descriptionId
      : course.descriptionId;
  const cover = toBrowserMediaUrl(course.coverUrl);
  const views = course.studentViewCount ?? 0;
  const tags = course.tags ?? [];
  const studyHref = `/dashboard/materials/categories/${course.slug}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(studyHref)}`;

  return (
    <div className="relative flex flex-1 flex-col bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-hero-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-seigaiha opacity-[0.12]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/learning-path"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mb-6 h-10 cursor-pointer gap-2 rounded-xl border-charcoal/15 bg-white/90 px-3.5 text-sm font-semibold text-charcoal/75 shadow-sm backdrop-blur hover:border-brand/25 hover:text-brand",
          )}
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {t("actions.backToList")}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,22rem)] lg:items-start xl:gap-8">
          <article className="overflow-hidden rounded-[1.4rem] border border-charcoal/10 bg-white shadow-[0_22px_48px_-34px_rgba(15,23,42,0.4)]">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                className="aspect-[16/9] w-full object-cover sm:aspect-[16/7]"
              />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-[var(--workspace-surface)] sm:aspect-[16/7]">
                <BrandLogo size={80} alt="" />
              </div>
            )}

            <div className="space-y-5 p-5 sm:space-y-6 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                  {t("detail.eyebrow")}
                </p>
                <h1 className="font-jp mt-1.5 text-pretty text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-[2.2rem] lg:leading-tight">
                  {name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-[var(--workspace-surface)] px-3 py-1.5 text-xs font-semibold text-charcoal/70">
                  <BookOpen className="size-3.5" aria-hidden />
                  {t("lessonsCount", { count: course.lessonCount })}
                </span>
                {views > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/15 bg-brand/8 px-3 py-1.5 text-xs font-semibold text-brand">
                    <Flame className="size-3.5" aria-hidden />
                    {t("views", { count: views })}
                  </span>
                ) : null}
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-xs font-semibold text-brand"
                    >
                      {locale === "en"
                        ? tag.nameEn || tag.nameId
                        : tag.nameId || tag.nameEn}
                    </span>
                  ))}
                </div>
              ) : null}

              {description ? (
                <RichTextView value={description} className="text-charcoal/75" />
              ) : (
                <p className="text-sm text-charcoal/55">{t("detail.noDescription")}</p>
              )}
            </div>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-[1.35rem] border border-charcoal/10 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] sm:p-6">
              <p className="text-[11px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                {t("detail.accessEyebrow")}
              </p>
              <h2 className="mt-1.5 text-lg font-bold tracking-tight text-ink">
                {isStudent ? t("detail.accessStudentTitle") : t("detail.accessGuestTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
                {isStudent
                  ? t("detail.accessStudentBody")
                  : t("detail.accessGuestBody")}
              </p>
              {isStudent ? (
                <Link
                  href={studyHref}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "mt-5 h-11 w-full cursor-pointer gap-2 rounded-xl font-semibold",
                  )}
                >
                  {t("actions.startLearning")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <Link
                  href={loginHref}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "mt-5 h-11 w-full cursor-pointer gap-2 rounded-xl font-semibold",
                  )}
                >
                  <LogIn className="size-4" aria-hidden />
                  {t("actions.loginToStudy")}
                </Link>
              )}
            </div>

            <section className="rounded-[1.35rem] border border-charcoal/10 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] sm:p-5">
              <div className="mb-4 border-b border-charcoal/8 pb-3">
                <h2 className="text-base font-bold text-ink">
                  {t("detail.lessonList")}
                </h2>
                <p className="mt-1 text-xs text-charcoal/55">
                  {t("detail.lessonListHint")}
                </p>
              </div>

              {course.lessons.length === 0 ? (
                <p className="py-6 text-center text-sm text-charcoal/55">
                  {t("detail.noLessons")}
                </p>
              ) : (
                <ol className="space-y-2.5">
                  {course.lessons.map((lesson) => (
                    <li
                      key={lesson.slug}
                      className="flex gap-3 rounded-2xl border border-charcoal/8 bg-[var(--workspace-surface)]/70 p-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-brand shadow-sm tabular-nums">
                        {lesson.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-jp text-sm font-semibold text-ink">
                            {lesson.title}
                          </p>
                          <Lock
                            className="mt-0.5 size-3.5 shrink-0 text-charcoal/35"
                            aria-hidden
                          />
                        </div>
                        {lesson.excerpt ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-charcoal/55">
                            {lesson.excerpt}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
