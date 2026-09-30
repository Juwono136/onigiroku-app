"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LogoutConfirmDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirmLogout() {
    startTransition(async () => {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(t(`errors.${mapAuthError(result.error)}`));
        return;
      }
      onOpenChange(false);
      toast.success(t("logout.success"));
      router.push("/login");
      router.refresh();
    });
  }

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
            {t("logout.confirmTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-charcoal/75">
            {t("logout.confirmBody")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse gap-2.5 border-t border-charcoal/10 bg-soft/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-7 sm:py-5">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="h-11 cursor-pointer rounded-xl px-5 font-semibold"
            onClick={() => onOpenChange(false)}
          >
            {t("logout.cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending}
            className="h-11 cursor-pointer rounded-xl px-5 font-semibold"
            onClick={confirmLogout}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("logout.submitting")}
              </>
            ) : (
              t("logout.confirm")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Convenience trigger button used on dashboards. */
export function SignOutButton() {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 cursor-pointer rounded-xl font-semibold"
      >
        {t("logout.action")}
      </Button>
      <LogoutConfirmDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
