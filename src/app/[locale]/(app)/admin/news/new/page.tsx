import { setRequestLocale } from "next-intl/server";

import { MaterialEditor } from "@/components/admin/materials/material-editor";
import { requireRole } from "@/lib/auth/session";

export default async function AdminNewsNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", { locale, callbackPath: "/admin/news/new" });
  return <MaterialEditor mode="create" surface="news" />;
}
