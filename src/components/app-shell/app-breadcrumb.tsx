"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items?: BreadcrumbItem[];
  className?: string;
};

/**
 * Dynamic breadcrumbs from pathname, with optional override items.
 */
export function AppBreadcrumb({ items, className }: Props) {
  const t = useTranslations("appShell");
  const pathname = usePathname();

  const resolved =
    items ??
    (() => {
      const crumbs: BreadcrumbItem[] = [
        { label: t("breadcrumb.home"), href: "/dashboard" },
      ];
      if (pathname.startsWith("/admin")) {
        crumbs[0] = { label: t("breadcrumb.home"), href: "/admin" };
        crumbs.push({ label: t("breadcrumb.admin") });
      } else if (pathname.startsWith("/settings")) {
        crumbs.push({ label: t("breadcrumb.settings") });
      } else if (pathname.startsWith("/dashboard")) {
        crumbs.push({ label: t("breadcrumb.dashboard") });
      } else {
        crumbs.push({ label: t("breadcrumb.app") });
      }
      return crumbs;
    })();

  return (
    <nav
      aria-label={t("breadcrumb.label")}
      className={cn("min-w-0", className)}
    >
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {resolved.map((item, index) => {
          const isLast = index === resolved.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-charcoal/35"
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href as "/dashboard"}
                  className="cursor-pointer truncate font-medium text-charcoal/60 transition-colors hover:text-brand"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate font-semibold",
                    isLast ? "text-ink" : "text-charcoal/60",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
