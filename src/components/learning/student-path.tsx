import { ArrowLeft, Check, Lock, Play, Tag } from "lucide-react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { getTranslations } from "next-intl/server";

import { PathCompletionPanel } from "@/components/learning/path-completion-panel";
import { RichTextView } from "@/components/learning/rich-text-view";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { StudentCategoryDetail } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = { category: StudentCategoryDetail; locale: string };

export async function StudentPath({ category, locale }: Props) {
  const t = await getTranslations("learningStudent");
  const name =
    locale === "en" ? category.nameEn || category.nameId : category.nameId;
  const description =
    locale === "en"
      ? category.descriptionEn || category.descriptionId
      : category.descriptionId;
  const cover = toBrowserMediaUrl(category.coverUrl);
  const total = category.lessonCount;
  const done = category.completedCount;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const tags = category.tags ?? [];
  const pathCompleted =
    Boolean(category.pathCompleted) || (total > 0 && done >= total);

  return (
    <div className="relative mx-auto w-full max-w-[96rem] px-3 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-workspace-mesh opacity-70"
        aria-hidden
      />

      <div className="relative mb-5 sm:mb-6">
        <Link
          href="/dashboard/materials"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 cursor-pointer gap-2 rounded-xl border-charcoal/15 bg-white/90 px-3.5 text-sm font-semibold text-charcoal/75 shadow-sm backdrop-blur hover:border-brand/25 hover:bg-white hover:text-brand",
          )}
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {t("actions.back")}
        </Link>
      </div>

      {pathCompleted && category.completion ? (
        <div className="relative mb-5 sm:mb-6">
          <PathCompletionPanel completion={category.completion} variant="card" />
        </div>
      ) : null}

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,22rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:gap-7">
        <header className="overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white shadow-[0_22px_48px_-34px_rgba(15,23,42,0.4)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="aspect-[16/9] w-full object-cover sm:aspect-[16/7]"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-[var(--workspace-surface)] sm:aspect-[16/7]">
              <BrandLogo size={72} alt="" />
            </div>
          )}
          <div className="space-y-4 p-5 sm:space-y-5 sm:p-7">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                {t("eyebrow")}
              </p>
              <h1 className="font-jp mt-1.5 text-pretty text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-[2.15rem] lg:leading-tight">
                {name}
              </h1>
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-xs font-semibold text-brand"
                  >
                    <Tag className="size-3.5 shrink-0" aria-hidden />
                    {locale === "en"
                      ? tag.nameEn || tag.nameId
                      : tag.nameId || tag.nameEn}
                  </span>
                ))}
              </div>
            ) : null}

            {description ? (
              <RichTextView value={description} className="text-charcoal/75" />
            ) : null}

            <div className="space-y-2 rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)]/80 p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-charcoal/60">
                <span>{t("pathProgress")}</span>
                <span className="tabular-nums text-ink">
                  {t("progress", { done, total })}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-charcoal/10">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-[1.35rem] border border-charcoal/10 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] sm:p-5 lg:sticky lg:top-20">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-charcoal/8 pb-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink sm:text-lg">
                {t("sidebar.title")}
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-charcoal/55">
                {t("lessonsCount", { count: total })}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-charcoal/10 bg-[var(--workspace-surface)] px-2.5 py-1 text-[11px] font-bold tabular-nums text-charcoal/65">
              {done}/{total}
            </span>
          </div>

          {category.lessons.length === 0 ? (
            <p className="py-10 text-center text-sm text-charcoal/55">
              {t("empty.lessons")}
            </p>
          ) : (
            <ol className="space-y-0">
              {category.lessons.map((lesson, index) => {
                const isLast = index === category.lessons.length - 1;
                const statusLabel = lesson.completed
                  ? t("lesson.done")
                  : lesson.locked
                    ? t("lesson.locked")
                    : lesson.inProgress
                      ? t("lesson.continue")
                      : t("lesson.start");

                const row = (
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-3 py-3 transition sm:px-3.5",
                      lesson.locked
                        ? "border-charcoal/8 bg-[var(--workspace-surface)]/60 opacity-75"
                        : "border-charcoal/10 bg-[var(--workspace-card)] hover:border-brand/30 hover:shadow-sm",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink sm:text-[0.9375rem]">
                        {lesson.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-charcoal/55 sm:text-xs">
                        {statusLabel}
                      </span>
                    </span>
                    {!lesson.locked ? (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <Play className="size-3.5 fill-current" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                );

                return (
                  <li key={lesson.id} className="flex gap-3">
                    <div className="flex w-9 shrink-0 flex-col items-center">
                      <span
                        className={cn(
                          "relative z-[1] flex size-9 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                          lesson.completed
                            ? "bg-brand text-white"
                            : lesson.locked
                              ? "border border-charcoal/15 bg-white text-charcoal/40"
                              : "border border-brand/25 bg-brand/10 text-brand",
                        )}
                      >
                        {lesson.completed ? (
                          <Check className="size-4" aria-hidden />
                        ) : lesson.locked ? (
                          <Lock className="size-3.5" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {!isLast ? (
                        <span
                          className="mt-1 w-0.5 flex-1 min-h-3 rounded-full bg-charcoal/15"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className={cn("min-w-0 flex-1", !isLast && "pb-3")}>
                      {lesson.locked ? (
                        <div>{row}</div>
                      ) : (
                        <Link
                          href={`/dashboard/materials/${lesson.slug}`}
                          className="block"
                        >
                          {row}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
