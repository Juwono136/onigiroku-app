"use client";

import { Loader2, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";

export function SignOutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(t(`errors.${mapAuthError(result.error)}`));
        return;
      }
      toast.success(t("logout.success"));
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={onClick}
      className="h-10 rounded-xl font-semibold"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="size-4" aria-hidden />
      )}
      {t("logout.action")}
    </Button>
  );
}
