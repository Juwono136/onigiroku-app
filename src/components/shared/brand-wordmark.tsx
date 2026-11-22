"use client";

import { BrandLogo } from "@/components/shared/brand-logo";
import { Link as LocaleLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  size?: number;
  priority?: boolean;
  /** Home by default; pass null for non-link lockup. */
  href?: "/" | "/dashboard" | "/admin" | null;
  /**
   * When true and `href="/"`, a click on the public home route scrolls to top
   * instead of navigating again.
   */
  scrollHomeToTop?: boolean;
};

/** Logo + “Onigiroku” lockup — shared by navbar, hero, and menus. */
export function BrandWordmark({
  className,
  logoClassName,
  textClassName,
  size = 36,
  priority = false,
  href = "/",
  scrollHomeToTop = false,
}: BrandWordmarkProps) {
  const pathname = usePathname();

  const content = (
    <>
      <BrandLogo
        size={size}
        priority={priority}
        alt=""
        className={cn(
          "shrink-0 bg-transparent object-contain",
          logoClassName,
        )}
      />
      <span className={cn("font-bold tracking-tight text-ink", textClassName)}>
        Onigiroku
      </span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2.5 text-ink transition-opacity hover:opacity-90",
    className,
  );

  if (href == null) {
    return (
      <div className={classes} aria-label="Onigiroku">
        {content}
      </div>
    );
  }

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!scrollHomeToTop || href !== "/" || pathname !== "/") return;
    event.preventDefault();
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <LocaleLink
      href={href}
      className={cn(classes, "group")}
      onClick={onClick}
    >
      {content}
    </LocaleLink>
  );
}
