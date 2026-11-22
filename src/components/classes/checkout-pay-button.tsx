"use client";

import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { checkoutPath } from "@/lib/packages/buy-intent";
import type { CheckoutResult } from "@/lib/packages/types";

type Props = {
  slug: string;
  /** Pre-formatted total, shown on the button (e.g. "Rp 150.000"). */
  totalLabel: string;
};

type ErrorState = {
  kind: "generic" | "unauthorized" | "unavailable" | "noUrl" | "notFound";
  detail?: string;
};

function isSafePaymentUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function CheckoutPayButton({ slug, totalLabel }: Props) {
  const t = useTranslations("classesPage");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  async function onPay() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageSlug: slug }),
      });
      const json = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            data?: CheckoutResult;
            error?: { code?: string; message?: string };
          }
        | null;

      if (!res.ok || !json?.success) {
        const code = json?.error?.code;
        if (res.status === 401 || code === "UNAUTHORIZED") {
          setError({ kind: "unauthorized" });
        } else if (res.status === 404 || code === "NOT_FOUND") {
          setError({ kind: "notFound" });
        } else if (res.status === 503 || code === "GO_API_UNAVAILABLE") {
          setError({ kind: "unavailable" });
        } else if (res.status === 409 || res.status === 422) {
          setError({ kind: "generic", detail: json?.error?.message });
        } else {
          setError({ kind: "generic" });
        }
        setPending(false);
        return;
      }

      const paymentUrl = json.data?.paymentUrl;
      if (!isSafePaymentUrl(paymentUrl)) {
        setError({ kind: "noUrl" });
        setPending(false);
        return;
      }

      // Keep the button in its pending state while the browser navigates away.
      window.location.assign(paymentUrl);
    } catch {
      setError({ kind: "generic" });
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={onPay}
        disabled={pending}
        aria-busy={pending}
        className="h-12 w-full cursor-pointer gap-2 rounded-xl text-[15px] font-semibold"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("checkout.paying")}
          </>
        ) : (
          <>
            <Lock className="size-4" aria-hidden />
            {t("checkout.pay")} · {totalLabel}
          </>
        )}
      </Button>

      {error ? (
        <div
          role="alert"
          className="flex gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{t(`checkout.errors.${error.kind}`)}</p>
            {error.detail ? (
              <p className="text-xs opacity-80">{error.detail}</p>
            ) : null}
            {error.kind === "unauthorized" ? (
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(checkoutPath(slug))}`}
                className="inline-block text-xs font-semibold underline"
              >
                {t("checkout.signInAgain")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
