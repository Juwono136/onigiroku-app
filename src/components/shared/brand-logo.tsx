import Image from "next/image";

import { cn } from "@/lib/utils";

/** Primary brand mark — transparent PNG (no black plate). */
export const BRAND_LOGO_SRC = "/images/onigiroku-logo.png" as const;

type BrandLogoProps = {
  className?: string;
  size?: number;
  priority?: boolean;
  alt?: string;
};

/** Transparent Onigiroku mark — charcoal outline only, no background plate. */
export function BrandLogo({
  className,
  size = 36,
  priority = false,
  alt = "Onigiroku",
}: BrandLogoProps) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={cn("bg-transparent object-contain", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "transparent",
        mixBlendMode: "normal",
      }}
    />
  );
}
