"use client";

import {
  BookOpen,
  Home,
  Info,
  Newspaper,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  MobileBottomNav,
  type MobileBottomNavItem,
} from "@/components/navigation/mobile-bottom-nav";
import { usePathname } from "@/i18n/routing";

const ITEMS = [
  { href: "/", key: "home", icon: Home, exact: true },
  { href: "/learning-path", key: "learningPath", icon: BookOpen },
  { href: "/classes", key: "classes", icon: UsersRound },
  { href: "/news", key: "news", icon: Newspaper },
  { href: "/about", key: "about", icon: Info },
] as const;

/**
 * Public marketing dock for small screens. Skipped on authenticated workspace
 * routes (those use AppMobileNav instead).
 */
export function SiteMobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isAppArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings");

  if (isAppArea) return null;

  const items: MobileBottomNavItem[] = ITEMS.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: t(item.key),
    exact: "exact" in item ? item.exact : false,
  }));

  return <MobileBottomNav items={items} ariaLabel={t("mobileNavLabel")} />;
}
