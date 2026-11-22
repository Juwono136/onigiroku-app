import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  items: string[];
  /** Show only the first N lines. */
  limit?: number;
  /** `compact` for cards, `full` for detail/checkout, `panel` for modal/preview. */
  variant?: "compact" | "full" | "panel";
  className?: string;
};

/** Brand-red checklist of package benefit lines. */
export function BenefitList({ items, limit, variant = "full", className }: Props) {
  const visible = typeof limit === "number" ? items.slice(0, limit) : items;
  if (visible.length === 0) return null;
  const compact = variant === "compact";

  return (
    <ul
      className={cn(
        compact ? "space-y-1.5" : variant === "panel" ? "space-y-2" : "space-y-2.5",
        className,
      )}
    >
      {visible.map((text, index) => (
        <li
          key={`${index}-${text}`}
          className={cn(
            "flex items-start gap-2.5 text-charcoal/85",
            compact ? "text-[13px] leading-snug" : "text-sm leading-relaxed sm:text-[0.95rem]",
          )}
        >
          <span
            className={cn(
              "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand",
              compact ? "size-4" : "size-5",
            )}
            aria-hidden
          >
            <Check className={compact ? "size-2.5" : "size-3"} strokeWidth={3} />
          </span>
          <span
            className={cn("min-w-0 break-words", compact && "line-clamp-2")}
          >
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}
