import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppProviders } from "@/components/providers/app-providers";
import { ScrollToTopButton } from "@/components/shared/scroll-to-top";
import { locales, type Locale } from "@/i18n/routing";

import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: {
      default: t("title"),
      template: "%s · Onigiroku",
    },
    description: t("description"),
    keywords: t("keywords"),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/images/onigiroku-logo.png", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: "/favicon.ico",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "Onigiroku",
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "website",
      images: [{ url: "/images/onigiroku-logo.png", width: 1111, height: 1020 }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="h-full scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            {children}
            <ScrollToTopButton />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
