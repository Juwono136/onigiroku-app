import { formatIdr } from "@/lib/packages/format";
import { packagePriceBreakdown } from "@/lib/packages/display";
import type { ClassPackage } from "@/lib/packages/types";
import { cn } from "@/lib/utils";

type Props = {
  pkg: ClassPackage;
  locale: string;
  /** e.g. "10% off" */
  discountLabel: string;
  listPriceLabel: string;
  size?: "md" | "lg";
  className?: string;
};

/** List price (struck through when discounted) + effective price + discount badge. */
export function ClassPrice({
  pkg,
  locale,
  discountLabel,
  listPriceLabel,
  size = "md",
  className,
}: Props) {
  const price = packagePriceBreakdown(pkg);

  return (
    <div className={cn("flex flex-wrap items-end gap-x-2.5 gap-y-1", className)}>
      <span
        className={cn(
          "font-bold tracking-tight text-ink tabular-nums",
          size === "lg" ? "text-3xl" : "text-xl",
        )}
      >
        {formatIdr(price.total, locale)}
      </span>
      {price.discounted ? (
        <>
          <span className="pb-0.5 text-sm font-medium text-charcoal/45 tabular-nums line-through decoration-charcoal/35">
            <span className="sr-only">{listPriceLabel}: </span>
            {formatIdr(price.base, locale)}
          </span>
          <span className="mb-0.5 inline-flex items-center rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
            {discountLabel}
          </span>
        </>
      ) : null}
    </div>
  );
}
