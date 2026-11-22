"use client";

import { BookOpen, LayoutDashboard, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  MobileBottomNav,
  type MobileBottomNavItem,
} from "@/components/navigation/mobile-bottom-nav";
import type { UserRole } from "@/lib/auth/roles";

type Props = {
  role: UserRole;
};

/**
 * Student-only mobile dock. Admin keeps sidebar / drawer only — too many
 * future admin menus to fit a compact bottom nav.
 */
export function AppMobileNav({ role }: Props) {
  const t = useTranslations("appShell");

  if (role === "ADMIN") return null;

  const items: MobileBottomNavItem[] = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: t("nav.dashboard"),
      exact: true,
    },
    {
      href: "/dashboard/materials",
      icon: BookOpen,
      label: t("nav.materials"),
    },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <MobileBottomNav
      items={items}
      ariaLabel={t("nav.mobileLabel")}
      className="app-workspace"
    />
  );
}
