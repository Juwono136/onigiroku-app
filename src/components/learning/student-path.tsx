import { Check, Lock, Play } from "lucide-react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { getTranslations } from "next-intl/server";

import { RichTextView } from "@/components/learning/rich-text-view";
import { Link } from "@/i18n/routing";
import type { StudentCategoryDetail } from "@/lib/learning/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = { category: StudentCategoryDetail; locale: string };

export async function StudentPath({ category, locale }: Props) {
  const t = await getTranslations("learningStudent");
  const name = locale === "en" ? category.nameEn || category.nameId : category.nameId;
  const description = locale === "en" ? category.descriptionEn || category.descriptionId : category.descriptionId;
  const cover = toBrowserMediaUrl(category.coverUrl);
  const total = category.lessonCount;
  const done = category.completedCount;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/dashboard/materials" className="text-sm font-semibold text-charcoal/60 hover:text-brand">
        {t("actions.back")}
      </Link>
      <header className="overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-white">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/7] w-full items-center justify-center bg-[var(--workspace-surface)]">
            <BrandLogo size={72} alt="" />
          </div>
        )}
        <div className="space-y-3 p-5 sm:p-7">
          <h1 className="font-jp text-2xl font-bold text-ink sm:text-3xl">{name}</h1>
          {description ? <RichTextView value={description} className="text-charcoal/75" /> : null}
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-charcoal/10">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs font-semibold text-charcoal/55">{t("progress", { done, total })}</p>
          </div>
        </div>
      </header>
      <ol className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-[1.15rem] before:w-px before:bg-charcoal/10">
        {category.lessons.map((lesson, index) => {
          const body = (
            <>
              <span className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                lesson.completed ? "bg-brand text-white" : lesson.locked ? "bg-charcoal/10 text-charcoal/40" : "bg-brand/10 text-brand",
              )}>
                {lesson.completed ? <Check className="size-4" /> : lesson.locked ? <Lock className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{lesson.title}</span>
                <span className="mt-0.5 block text-xs text-charcoal/55">
                  {lesson.completed ? t("lesson.done") : lesson.locked ? t("lesson.locked") : lesson.inProgress ? t("lesson.continue") : t("lesson.start")}
                </span>
              </span>
              {!lesson.locked ? <Play className="size-4 text-brand" aria-hidden /> : null}
            </>
          );
          return (
            <li key={lesson.id}>
              {lesson.locked ? (
                <div className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white/70 px-4 py-3 opacity-70">
                  {body}
                </div>
              ) : (
                <Link href={`/dashboard/materials/${lesson.slug}`} className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white px-4 py-3 transition hover:border-brand/30">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {category.lessons.length === 0 ? (
        <p className="text-center text-sm text-charcoal/55">{t("empty.lessons")}</p>
      ) : null}
    </div>
  );
}
