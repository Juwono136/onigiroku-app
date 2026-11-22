import { BookOpen, ClipboardCheck, Dumbbell, GraduationCap, ListChecks, Check } from "lucide-react";

import type { PackageEntitlement } from "@/lib/packages/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof BookOpen> = {
  learning_path: BookOpen,
  quiz: ListChecks,
  exam: ClipboardCheck,
  private_class: GraduationCap,
  practice: Dumbbell,
};

type Props = {
  entitlements: PackageEntitlement[];
  typeLabel: (featureType: string) => string;
  allLabel: string;
  className?: string;
};

export function EntitlementList({
  entitlements,
  typeLabel,
  allLabel,
  className,
}: Props) {
  return (
    <ul className={cn("space-y-2", className)}>
      {entitlements.map((item, index) => {
        const Icon = ICONS[item.featureType] ?? Check;
        const target = item.targetName?.trim() || (item.targetId ? "" : allLabel);
        return (
          <li
            key={item.id ?? `${item.featureType}-${item.targetId ?? "all"}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-charcoal/10 bg-[var(--canvas)]/70 px-3 py-2.5"
          >
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 text-sm leading-snug">
              <span className="block text-[10px] font-bold tracking-[0.14em] text-charcoal/45 uppercase">
                {typeLabel(item.featureType)}
              </span>
              {target ? (
                <span className="font-jp block truncate font-semibold text-ink">
                  {target}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
