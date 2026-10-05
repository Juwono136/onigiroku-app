"use client";

import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FilterSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

/**
 * Professional filter/dropdown select for admin toolbars and forms.
 * Portal-based so menus are never clipped by overflow containers.
 */
export function FilterSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder,
  className,
  triggerClassName,
  disabled = false,
}: Props) {
  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? placeholder ?? ariaLabel;

  return (
    <div className={cn("min-w-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "group/filter-select flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-charcoal/12 bg-white px-3.5 text-left text-sm font-semibold text-ink shadow-sm outline-none transition-all",
            "hover:border-charcoal/25 hover:bg-white",
            "focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30",
            "data-popup-open:border-brand/40 data-popup-open:ring-2 data-popup-open:ring-brand/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName,
          )}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDownIcon
            className="size-4 shrink-0 text-charcoal/45 transition-transform duration-200 group-data-popup-open/filter-select:rotate-180"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="z-[80] min-w-[var(--anchor-width)] rounded-2xl border border-charcoal/10 bg-white p-1.5 shadow-[0_18px_40px_-24px_rgba(24,24,27,0.45)] ring-1 ring-charcoal/5"
        >
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              if (next != null && String(next) !== value) {
                onValueChange(String(next));
              }
            }}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className={cn(
                  "cursor-pointer rounded-xl py-2.5 pr-8 pl-3 text-sm font-medium text-ink",
                  "focus:bg-soft focus:text-ink",
                )}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
