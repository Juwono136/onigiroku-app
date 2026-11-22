import { redirect } from "next/navigation";

import { defaultLocale } from "@/i18n/routing";
import { parseBuySlug } from "@/lib/packages/buy-intent";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * Package detail pages are retired — catalog cards carry the full pitch and
 * Buy now goes straight to checkout. Keep this route as a soft redirect so old
 * bookmarks and external links still resolve.
 */
export default async function ClassPackageDetailRedirect({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  const slug = parseBuySlug(rawSlug);
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  if (!slug) {
    redirect(`${prefix}/classes`);
  }
  // Prefer checkout for known slugs so deep links still complete a purchase.
  redirect(`${prefix}/classes/${encodeURIComponent(slug)}/checkout`);
}
