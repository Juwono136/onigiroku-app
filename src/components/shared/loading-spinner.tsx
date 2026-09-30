"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2 text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-5 animate-spin text-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
