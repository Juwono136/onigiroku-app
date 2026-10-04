"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  tone?: "brand" | "danger";
  onConfirm: () => void;
};

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  pending = false,
  tone = "brand",
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-xl sm:max-w-md"
      >
        <DialogHeader className="gap-2.5 px-6 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-5">
          <DialogTitle className="pr-8 text-lg font-bold tracking-tight text-ink">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-charcoal/75">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse gap-2.5 border-t border-charcoal/10 bg-soft/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="h-11 cursor-pointer rounded-xl px-5 font-semibold"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={pending}
            className={cn(
              "h-11 cursor-pointer rounded-xl px-5 font-semibold",
              tone === "danger" &&
                "bg-destructive text-white hover:bg-destructive/90",
            )}
            onClick={onConfirm}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {pendingLabel ?? confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
