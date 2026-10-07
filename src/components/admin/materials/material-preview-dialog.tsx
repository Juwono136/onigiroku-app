"use client";

import type { JSONContent } from "@tiptap/react";
import { ExternalLink, Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { MaterialTiptapViewer } from "@/components/admin/materials/material-tiptap-viewer";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: JSONContent;
  coverUrl?: string | null;
  /** Public news URL slug when already published. */
  publicSlug?: string | null;
  published?: boolean;
};

/**
 * In-editor preview for PUBLIC (news) materials.
 * Mirrors the public article reading experience; published items can open the live page.
 */
export function MaterialPreviewDialog({
  open,
  onOpenChange,
  title,
  body,
  coverUrl,
  publicSlug,
  published = false,
}: Props) {
  const t = useTranslations("adminMaterials");
  const locale = useLocale();
  const displayTitle = title.trim() || t("untitled");
  const canOpenLive = Boolean(published && publicSlug);
  const pathLabel = publicSlug
    ? `/${locale === "en" ? "en/" : ""}news/${publicSlug}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="isolate flex max-h-[min(92dvh,960px)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-[1.5rem] border border-charcoal/12 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)] sm:w-[calc(100%-2rem)] sm:max-w-3xl"
      >
        <DialogHeader className="relative z-20 shrink-0 gap-1.5 border-b border-charcoal/10 bg-white px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-ink">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Eye className="size-4" aria-hidden />
            </span>
            {t("preview.title")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-charcoal/60">
            {t("preview.description")}
          </DialogDescription>
          {pathLabel ? (
            <p className="truncate font-mono text-[11px] text-charcoal/45">
              {pathLabel}
            </p>
          ) : null}
        </DialogHeader>

        <div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f4ef]">
          <div className="relative px-4 py-6 sm:px-8 sm:py-8">
            <article className="relative mx-auto w-full max-w-2xl">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                {t("preview.eyebrow")}
              </p>
              <h2 className="font-jp mt-2 text-pretty text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem] sm:leading-tight">
                {displayTitle}
              </h2>

              {coverUrl ? (
                <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-charcoal/10 bg-soft shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="mt-5 rounded-[1.25rem] border border-charcoal/10 bg-white px-4 py-5 shadow-[0_14px_36px_-28px_rgba(67,64,64,0.5)] sm:mt-6 sm:px-6 sm:py-7">
                <MaterialTiptapViewer content={body} enableImageZoom={false} />
              </div>
            </article>
          </div>
        </div>

        <div className="relative z-20 shrink-0 border-t border-charcoal/10 bg-white px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full cursor-pointer rounded-2xl border-charcoal/15 bg-white font-semibold sm:w-auto sm:min-w-[7.5rem]"
              onClick={() => onOpenChange(false)}
            >
              {t("preview.close")}
            </Button>
            {canOpenLive ? (
              <Link
                href={`/news/${publicSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants(),
                  "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl font-semibold sm:w-auto sm:min-w-[11rem]",
                )}
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                {t("preview.openLive")}
              </Link>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
