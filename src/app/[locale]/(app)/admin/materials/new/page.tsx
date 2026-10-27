import { redirect } from "@/i18n/routing";

export default async function AdminMaterialsNewRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/admin/news/new", locale });
}
