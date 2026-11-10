"use client";

import { useEffect } from "react";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type MobileBottomNavItem = {
  /** App-relative path accepted by next-intl `Link`. */
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Exact path match only (e.g. `/dashboard`). */
  exact?: boolean;
};

// next-intl Link without a pathnames map accepts string hrefs at runtime.
type AppHref = React.ComponentProps<typeof Link>["href"];

type Props = {
  items: MobileBottomNavItem[];
  ariaLabel: string;
  className?: string;
};

/**
 * Mobile-first dock. Sets `html.has-mobile-bottom-nav` so scroll-to-top and
 * page padding clear the bar. Hidden from `md` upward (sidebar / top nav take over).
 *
 * Background stays fully opaque so cover images / card content never bleed through.
 */
export function MobileBottomNav({ items, ariaLabel, className }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-mobile-bottom-nav");
    return () => root.classList.remove("has-mobile-bottom-nav");
  }, []);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 md:hidden",
        // Opaque base + safe-area fill — no glass / no content bleed-through.
        "border-t border-charcoal/15 bg-[var(--workspace-elevated,var(--canvas,#faf8f6))]",
        "pb-[env(safe-area-inset-bottom,0px)]",
        "shadow-[0_-10px_28px_-18px_rgba(24,24,27,0.35)]",
        className,
      )}
    >
      <div className="relative isolate">
        <div
          className="pointer-events-none absolute inset-0 bg-asanoha opacity-[0.35]"
          aria-hidden
        />
        <ul className="relative mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1.5 pt-1.5 pb-1.5">
          {items.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href as AppHref}
                  className={cn(
                    "group relative flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors",
                    active
                      ? "text-brand"
                      : "text-charcoal/60 hover:text-ink",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-xl transition-all duration-200",
                      active
                        ? "bg-brand text-white shadow-[0_8px_18px_-10px_rgba(230,0,18,0.75)]"
                        : "bg-charcoal/[0.04] group-hover:bg-charcoal/[0.08]",
                    )}
                  >
                    <Icon className="size-[1.15rem]" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-[10px] font-semibold tracking-wide",
                      active ? "text-brand" : "text-charcoal/60",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
