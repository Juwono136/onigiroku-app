import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function CheckoutLoading() {
  const t = await getTranslations("classesPage");
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <p className="inline-flex items-center gap-2 text-sm font-medium text-charcoal/60">
        <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
        {t("checkout.loading")}
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,22rem)]">
        <div className="h-96 animate-pulse rounded-[1.25rem] bg-charcoal/[0.06]" />
        <div className="h-72 animate-pulse rounded-[1.25rem] bg-charcoal/[0.06]" />
      </div>
    </div>
  );
}
