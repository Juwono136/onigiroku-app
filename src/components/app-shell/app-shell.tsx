"use client";

import { AppFooter } from "@/components/app-shell/app-footer";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopbar } from "@/components/app-shell/app-topbar";
import { SidebarProvider } from "@/components/app-shell/sidebar-context";
import type { UserRole } from "@/lib/auth/roles";

export type AppShellUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

type Props = {
  user: AppShellUser;
  role: UserRole;
  children: React.ReactNode;
};

/**
 * Dedicated authenticated workspace chrome — separate from marketing SiteHeader/Footer.
 */
export function AppShell({ user, role, children }: Props) {
  return (
    <SidebarProvider>
      <div className="app-workspace flex min-h-svh bg-[var(--workspace-bg)] text-ink">
        <AppSidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar user={user} />
          <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--workspace-bg)]">
            {children}
          </div>
          <AppFooter role={role} />
        </div>
      </div>
    </SidebarProvider>
  );
}
