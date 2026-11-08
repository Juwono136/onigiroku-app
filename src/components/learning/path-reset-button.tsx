"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  pathName: string;
  /** Only offer reset when the student has path progress to clear. */
  canReset: boolean;
  variant?: "outline" | "ghost" | "destructive";
  className?: string;
};

export function PathResetButton({
  slug,
  pathName,
  canReset,
  variant = "outline",
  className,
}: Props) {
  const t = useTranslations("learningStudent");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canReset) return null;

  function confirmReset() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/learning/categories/${encodeURIComponent(slug)}/reset?locale=${locale === "en" ? "en" : "id"}`,
          {
            method: "POST",
            headers: { Accept: "application/json" },
          },
        );
        const payload = (await res.json()) as {
          success?: boolean;
          error?: { code?: string; message?: string };
        };
        if (!res.ok || !payload.success) {
          toast.error(t("reset.errors.RESET_FAILED"));
          return;
        }
        setOpen(false);
        toast.success(t("reset.success"));
        router.refresh();
      } catch {
        toast.error(t("reset.errors.RESET_FAILED"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({ variant }),
          "h-11 cursor-pointer gap-2 rounded-2xl px-5 font-semibold",
          className,
        )}
      >
        <RotateCcw className="size-4 shrink-0" aria-hidden />
        {t("reset.cta")}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
        }}
      >
        <DialogContent
          showCloseButton={!pending}
          className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-xl sm:max-w-md"
        >
          <DialogHeader className="gap-2.5 px-6 pt-6 pb-4 sm:px-7 sm:pt-7">
            <DialogTitle className="pr-8 text-lg font-bold tracking-tight text-ink">
              {t("reset.confirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-charcoal/75">
              {t("reset.confirmBody", { path: pathName })}
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 border-y border-charcoal/8 bg-[var(--workspace-surface)]/80 px-6 py-4 text-sm text-charcoal/70 sm:px-7">
            <li className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              <span>{t("reset.keepsHistory")}</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              <span>{t("reset.clearsProgress")}</span>
            </li>
          </ul>

          <div className="flex flex-col-reverse gap-2 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="h-11 cursor-pointer rounded-xl font-semibold"
              onClick={() => setOpen(false)}
            >
              {t("reset.cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending}
              className="h-11 cursor-pointer gap-2 rounded-xl bg-brand font-semibold text-white hover:bg-brand/90"
              onClick={confirmReset}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-4" aria-hidden />
              )}
              {pending ? t("reset.pending") : t("reset.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
