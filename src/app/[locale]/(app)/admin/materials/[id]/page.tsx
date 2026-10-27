import { redirect } from "@/i18n/routing";

export default async function AdminMaterialsEditRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect({ href: `/admin/news/${id}`, locale });
}
