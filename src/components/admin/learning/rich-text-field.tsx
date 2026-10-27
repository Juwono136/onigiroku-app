"use client";

import type { JSONContent } from "@tiptap/react";
import { useMemo } from "react";

import { MaterialTiptapEditor } from "@/components/admin/materials/material-tiptap-editor";
import { docFromStored, storedFromDoc, visibleLength } from "@/lib/learning/rich-text";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (stored: string) => void;
  placeholder?: string;
  max: number;
  disabled?: boolean;
  counterLabel: string;
  /** Same toolbar as the lesson body, including images and tables. */
  full?: boolean;
};

export function RichTextField({
  value,
  onChange,
  placeholder,
  max,
  disabled,
  counterLabel,
  full = false,
}: Props) {
  const doc = useMemo(() => docFromStored(value), [value]);
  const count = visibleLength(value);
  const over = count > max;

  return (
    <div className="space-y-1.5">
      <MaterialTiptapEditor
        content={doc}
        compact={!full}
        short={full}
        disabled={disabled}
        placeholder={placeholder}
        className="rounded-2xl"
        onChange={(next: JSONContent) => onChange(storedFromDoc(next))}
      />
      <p className={cn("text-right text-[11px] font-semibold", over ? "text-destructive" : "text-charcoal/50")}>
        {counterLabel}
      </p>
    </div>
  );
}
