import { setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Link } from "@/i18n/routing";

export default async function PrivacyPage({
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
          {isId ? "Kebijakan Privasi" : "Privacy Policy"}
        </h1>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-charcoal/80 sm:text-base">
          {isId
            ? "Dokumen privasi lengkap akan dipublikasikan sebelum peluncuran produksi. Onigiroku mengikuti prinsip minimasi data dan kontrol akses sesuai PRD."
            : "A full privacy policy will be published before production launch. Onigiroku follows data minimization and access-control principles from the PRD."}
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
