"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default function CheckoutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("classesPage");
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h1 className="text-xl font-bold tracking-tight text-ink">
        {t("checkout.unavailableTitle")}
      </h1>
      <p className="text-sm leading-relaxed text-charcoal/65">
        {t("checkout.unavailableBody")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          onClick={reset}
          className="h-10 cursor-pointer rounded-xl px-5 font-semibold"
        >
          {t("checkout.retry")}
        </Button>
        <Link
          href="/classes"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 cursor-pointer rounded-xl px-5 font-semibold",
          )}
        >
          {t("actions.browseClasses")}
        </Link>
      </div>
    </div>
  );
}
