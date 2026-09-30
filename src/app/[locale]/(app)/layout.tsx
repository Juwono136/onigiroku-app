import { setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import {
  getSessionRole,
  getSessionUser,
  requireSession,
} from "@/lib/auth/session";

export default async function AppWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireSession({ locale });
  const user = getSessionUser(session);
  const role = getSessionRole(session);

  return (
    <AppShell
      role={role}
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
