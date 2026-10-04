import { setRequestLocale } from "next-intl/server";

import { UsersManagement } from "@/components/admin/users-management";
import { getSessionUser, requireRole } from "@/lib/auth/session";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireRole("ADMIN", {
    locale,
    callbackPath: "/admin/users",
  });

  return <UsersManagement currentUserId={getSessionUser(session).id} />;
}
