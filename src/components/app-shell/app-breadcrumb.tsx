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
 * Admin home is a single "Home" crumb (no duplicate Overview).
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
      const segments = pathname.split("/").filter(Boolean);
      if (pathname === "/admin/news" || pathname.startsWith("/admin/news/") || pathname.startsWith("/admin/materials")) {
        crumbs[0] = { label: t("breadcrumb.home"), href: "/admin" };
        const onList = pathname === "/admin/news" || pathname === "/admin/materials";
        crumbs.push({
          label: t("breadcrumb.news"),
          href: onList ? undefined : "/admin/news",
        });
        if (!onList) {
          crumbs.push({
            label: segments[segments.length - 1] === "new"
              ? t("breadcrumb.newsNew")
              : t("breadcrumb.newsEdit"),
          });
        }
      } else if (pathname === "/admin/learning" || pathname.startsWith("/admin/learning/")) {
        crumbs[0] = { label: t("breadcrumb.home"), href: "/admin" };
        const onList = pathname === "/admin/learning";
        crumbs.push({
          label: t("breadcrumb.learning"),
          href: onList ? undefined : "/admin/learning",
        });
        if (segments[2] === "new") {
          crumbs.push({ label: t("breadcrumb.categoryNew") });
        } else if (segments[3] === "lessons") {
          crumbs.push({
            label: t("breadcrumb.categoryEdit"),
            href: `/admin/learning/${segments[2]}`,
          });
          crumbs.push({
            label: segments[4] === "new" ? t("breadcrumb.lessonNew") : t("breadcrumb.lessonEdit"),
          });
        } else if (!onList) {
          crumbs.push({ label: t("breadcrumb.categoryEdit") });
        }
      } else if (pathname.startsWith("/admin/users")) {
        crumbs[0] = { label: t("breadcrumb.home"), href: "/admin" };
        crumbs.push({ label: t("breadcrumb.users") });
      } else if (pathname.startsWith("/admin")) {
        // Admin landing: single Home crumb (current page)
        crumbs[0] = { label: t("breadcrumb.home") };
      } else if (pathname.startsWith("/settings")) {
        crumbs.push({ label: t("breadcrumb.settings") });
      } else if (pathname.startsWith("/dashboard/materials")) {
        const onList = pathname === "/dashboard/materials";
        crumbs.push({
          label: t("breadcrumb.learning"),
          href: onList ? undefined : "/dashboard/materials",
        });
        if (pathname.includes("/categories/")) {
          crumbs.push({ label: t("breadcrumb.path") });
        } else if (!onList) {
          crumbs.push({ label: t("breadcrumb.materialsRead") });
        }
      } else if (pathname.startsWith("/dashboard")) {
        // Student dashboard landing = Home only
        crumbs[0] = { label: t("breadcrumb.home") };
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
