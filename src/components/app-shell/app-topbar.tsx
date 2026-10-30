"use client";

import {
  ExternalLink,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AppBreadcrumb } from "@/components/app-shell/app-breadcrumb";
import { useSidebar } from "@/components/app-shell/sidebar-context";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useSession } from "@/lib/auth/client";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
};

export function AppTopbar({ user }: Props) {
  const t = useTranslations("appShell");
  const { collapsed, mobileOpen, toggleCollapsed, toggleMobileOpen } =
    useSidebar();
  const { data: liveSession } = useSession();

  // Prefer live client session so avatar/name update immediately after Settings edits.
  const liveUser = liveSession?.user;
  const displayUser = {
    name: liveUser?.name ?? user.name,
    email: liveUser?.email ?? user.email,
    image: toBrowserMediaUrl(liveUser?.image ?? user.image),
    role:
      (liveUser as { role?: string | null } | undefined)?.role ?? user.role,
  };

  return (
    <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-[var(--workspace-elevated)]/95 backdrop-blur-md">
      <div className="relative flex h-14 items-center gap-2.5 px-3 sm:h-16 sm:gap-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={toggleMobileOpen}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "size-10 shrink-0 cursor-pointer rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)] md:hidden",
          )}
          aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "hidden size-10 shrink-0 cursor-pointer rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)] md:inline-flex",
          )}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden />
          )}
        </button>

        <AppBreadcrumb className="hidden min-w-0 flex-1 md:block" />

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden h-9 cursor-pointer gap-1.5 rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)] px-3 font-semibold sm:inline-flex",
            )}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t("topbar.publicPage")}
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-9 cursor-pointer rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)] sm:hidden",
            )}
            aria-label={t("topbar.publicPage")}
            title={t("topbar.publicPage")}
          >
            <ExternalLink className="size-4" aria-hidden />
          </Link>

          <LocaleSwitcher variant="auto" />
          <UserMenu user={displayUser} />
        </div>
      </div>
    </header>
  );
}
