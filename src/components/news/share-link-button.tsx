"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  title: string;
  className?: string;
};

function subscribeNoop() {
  return () => undefined;
}

function getCanNativeShare() {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

/** Copy / native-share for public news articles. */
export function ShareLinkButton({ url, title, className }: Props) {
  const t = useTranslations("news");
  const [copied, setCopied] = useState(false);
  const canNativeShare = useSyncExternalStore(
    subscribeNoop,
    getCanNativeShare,
    () => false,
  );

  async function share() {
    try {
      if (canNativeShare) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success(t("share.copied"));
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(t("share.failed"));
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void share()}
      className={cn(
        "h-10 cursor-pointer gap-2 rounded-xl border-charcoal/12 bg-white/90 px-3.5 font-semibold shadow-sm",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-brand" aria-hidden />
      ) : canNativeShare ? (
        <Share2 className="size-3.5 opacity-70" aria-hidden />
      ) : (
        <Link2 className="size-3.5 opacity-70" aria-hidden />
      )}
      {copied ? t("share.copiedShort") : t("share.button")}
    </Button>
  );
}
