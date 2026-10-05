import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { MaterialsList } from "@/components/materials/materials-list";
import { requireAnyRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function StudentMaterialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale } = await params;
  const { tag } = await searchParams;
  setRequestLocale(locale);

  await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: "/dashboard/materials",
  });

  return <MaterialsList key={tag ?? ""} initialTag={(tag ?? "").trim()} />;
}
