import { setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Link } from "@/i18n/routing";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          Legal
        </p>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {isId ? "Syarat Layanan" : "Terms of Service"}
        </h1>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-charcoal/80 sm:text-base">
          {isId
            ? "Syarat layanan resmi akan dilengkapi sebelum onboarding pengguna berbayar."
            : "Official terms will be completed before paid user onboarding."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          ← {isId ? "Beranda" : "Home"}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
