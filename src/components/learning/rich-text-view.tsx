"use client";

import { MaterialTiptapViewer } from "@/components/admin/materials/material-tiptap-viewer";
import { docFromStored } from "@/lib/learning/rich-text";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  className?: string;
};

export function RichTextView({ value, className }: Props) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{")) {
    return <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-ink", className)}>{value}</p>;
  }
  return (
    <MaterialTiptapViewer
      content={docFromStored(trimmed)}
      enableImageZoom={false}
      className={cn("text-sm", className)}
    />
  );
}
