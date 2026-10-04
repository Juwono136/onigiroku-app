"use client";

import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useSidebar } from "@/components/app-shell/sidebar-context";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { getDashboardPath, type UserRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

type Props = {
  role: UserRole;
};

type NavItem = {
  href: "/dashboard" | "/admin" | "/settings";
  icon: typeof LayoutDashboard;
  labelKey: "dashboard" | "admin" | "settings";
};

export function AppSidebar({ role }: Props) {
  const t = useTranslations("appShell");
  const pathname = usePathname();
  const { collapsed, mobileOpen, setMobileOpen, toggleCollapsed } =
    useSidebar();
  const homeHref = getDashboardPath(role);
  const year = new Date().getFullYear();

  const items: NavItem[] =
    role === "ADMIN"
      ? [
          { href: "/admin", icon: Shield, labelKey: "admin" },
          { href: "/settings", icon: Settings, labelKey: "settings" },
        ]
      : [
          {
            href: "/dashboard",
            icon: LayoutDashboard,
            labelKey: "dashboard",
          },
          { href: "/settings", icon: Settings, labelKey: "settings" },
        ];

  const sectionLabel =
    role === "ADMIN" ? t("nav.sectionAdmin") : t("nav.sectionLearn");

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNav(options: { compact: boolean; showClose?: boolean }) {
    const { compact, showClose } = options;

    return (
      <>
        <div
          className={cn(
            "relative flex h-16 shrink-0 items-center gap-2 border-b border-charcoal/10 px-3",
            compact && "justify-center px-2",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/[0.06] via-transparent to-transparent"
            aria-hidden
          />
          <BrandWordmark
            href={homeHref}
            size={compact ? 28 : 32}
            priority
            className={cn(
              "relative z-10 min-w-0 flex-1",
              compact && "flex-none gap-0 [&_span]:sr-only",
            )}
            textClassName="truncate text-base"
          />
          {showClose ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("nav.closeMenu")}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "relative z-10 size-9 shrink-0 cursor-pointer rounded-xl text-charcoal/70 hover:bg-white/70 hover:text-ink",
              )}
            >
              <X className="size-5" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-5">
          {!compact ? (
            <p className="px-2.5 text-[10px] font-semibold tracking-[0.16em] text-charcoal/45 uppercase">
              {sectionLabel}
            </p>
          ) : null}

          <nav aria-label={t("nav.label")} className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={compact ? t(`nav.${item.labelKey}`) : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                    compact && "justify-center px-2",
                    active
                      ? "bg-brand text-white shadow-[0_10px_24px_-14px_rgba(230,0,18,0.7)]"
                      : "text-charcoal/70 hover:bg-white/70 hover:text-ink",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[1.15rem] shrink-0 transition-colors",
                      active
                        ? "text-white"
                        : "text-charcoal/50 group-hover:text-brand",
                    )}
                    aria-hidden
                  />
                  {!compact ? (
                    <span className="truncate">{t(`nav.${item.labelKey}`)}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-charcoal/10 px-3 py-3.5",
            compact && "px-2",
          )}
        >
          {!compact ? (
            <p className="px-1 text-[11px] leading-relaxed text-charcoal/50">
              {t("sidebar.copyright", { year })}
            </p>
          ) : (
            <div
              className="mx-auto size-1.5 rounded-full bg-brand/50"
              aria-hidden
            />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar — sticky viewport height so collapse control never scrolls away */}
      <aside
        className={cn(
          "group/sidebar sticky top-0 z-30 hidden h-svh shrink-0 self-start flex-col border-r border-charcoal/10 bg-[var(--workspace-sidebar)] transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
        data-collapsed={collapsed || undefined}
      >
        <div className="jp-rail flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,transparent_28%)]">
          {renderNav({ compact: collapsed })}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          className={cn(
            "absolute top-1/2 -right-3 z-40 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-charcoal/15 bg-[var(--workspace-elevated)] text-charcoal/70 shadow-md transition-all duration-200",
            "pointer-events-none opacity-0 group-hover/sidebar:pointer-events-auto group-hover/sidebar:opacity-100",
            "focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
            "hover:border-brand/40 hover:bg-brand hover:text-white",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden />
          ) : (
            <ChevronLeft className="size-3.5" aria-hidden />
          )}
        </button>
      </aside>

      {/* Mobile drawer — always expanded labels */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 cursor-pointer bg-ink/40 transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label={t("nav.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-charcoal/10 bg-[var(--workspace-sidebar)] shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="jp-rail flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,transparent_28%)]">
            {renderNav({ compact: false, showClose: true })}
          </div>
        </aside>
      </div>
    </>
  );
}
