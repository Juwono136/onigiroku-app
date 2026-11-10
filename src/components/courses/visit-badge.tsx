import { Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { formatCompactCount, formatFullCount } from "@/lib/format/compact-number";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  locale: string;
  /** Overlay on cover images vs inline meta chip. */
  tone?: "overlay" | "soft";
  className?: string;
};

export async function VisitBadge({
  count,
  locale,
  tone = "soft",
  className,
}: Props) {
  if (count <= 0) return null;

  const t = await getTranslations("courses");
  const compact = formatCompactCount(count, locale);
  const full = formatFullCount(count, locale);
  const label = t("viewsCompact", { count: compact });
  const fullLabel = t("viewsFull", { count: full });

  return (
    <span
      title={fullLabel}
      aria-label={fullLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums backdrop-blur",
        tone === "overlay"
          ? "bg-ink/80 text-white shadow-sm"
          : "border border-brand/15 bg-brand/8 text-brand",
        className,
      )}
    >
      <Flame
        className={cn(
          "size-3 shrink-0",
          tone === "overlay" ? "text-brand" : "text-brand",
        )}
        aria-hidden
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
