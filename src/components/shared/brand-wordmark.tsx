import { BrandLogo } from "@/components/shared/brand-logo";
import { Link as LocaleLink } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  size?: number;
  priority?: boolean;
  href?: "/" | null;
};

/** Logo + “Onigiroku” lockup — shared by navbar, hero, and menus. */
export function BrandWordmark({
  className,
  logoClassName,
  textClassName,
  size = 36,
  priority = false,
  href = "/",
}: BrandWordmarkProps) {
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

  return (
    <LocaleLink href={href} className={cn(classes, "group")}>
      {content}
    </LocaleLink>
  );
}
