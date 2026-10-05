import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { MaterialReader } from "@/components/materials/material-reader";
import { goStudentGetMaterial } from "@/lib/api/go-materials";
import {
  getSessionRole,
  getSessionUser,
  requireAnyRole,
} from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function StudentMaterialReaderPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await requireAnyRole(["USER", "ADMIN"], {
    locale,
    callbackPath: `/dashboard/materials/${slug}`,
  });

  const user = getSessionUser(session);
  const role = getSessionRole(session);

  let material;
  try {
    material = await goStudentGetMaterial(user.id, role, slug);
  } catch {
    notFound();
  }

  return <MaterialReader material={material} locale={locale} />;
}
