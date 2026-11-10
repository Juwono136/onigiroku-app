"use client";

import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  Settings,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  MobileBottomNav,
  type MobileBottomNavItem,
} from "@/components/navigation/mobile-bottom-nav";
import type { UserRole } from "@/lib/auth/roles";

type Props = {
  role: UserRole;
};

export function AppMobileNav({ role }: Props) {
  const t = useTranslations("appShell");

  const items: MobileBottomNavItem[] =
    role === "ADMIN"
      ? [
          {
            href: "/admin",
            icon: LayoutDashboard,
            label: t("nav.admin"),
            exact: true,
          },
          { href: "/admin/users", icon: Users, label: t("nav.users") },
          { href: "/admin/news", icon: Newspaper, label: t("nav.news") },
          {
            href: "/admin/learning",
            icon: GraduationCap,
            label: t("nav.learning"),
          },
          { href: "/settings", icon: Settings, label: t("nav.settings") },
        ]
      : [
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
