"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

import { EMPTY_TIPTAP_DOC } from "@/components/admin/materials/material-tiptap-editor";
import { ImageLightbox } from "@/components/media/image-lightbox";
import { cn } from "@/lib/utils";

type Props = {
  content: JSONContent | unknown;
  className?: string;
  /** Enable click-to-zoom on body images (default true for readers). */
  enableImageZoom?: boolean;
};

function asDoc(content: JSONContent | unknown): JSONContent {
  if (
    content &&
    typeof content === "object" &&
    "type" in content &&
    (content as JSONContent).type === "doc"
  ) {
    return content as JSONContent;
  }
  return EMPTY_TIPTAP_DOC;
}

export function MaterialTiptapViewer({
  content,
  className,
  enableImageZoom = true,
}: Props) {
  const doc = asDoc(content);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-brand underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: cn(
            "rounded-xl w-full max-w-full h-auto",
            enableImageZoom &&
              "cursor-zoom-in transition-opacity hover:opacity-95",
          ),
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "material-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: doc,
    editorProps: {
      attributes: {
        class:
          "material-prose tiptap-content font-jp px-1 py-1 focus:outline-none",
      },
      handleDOMEvents: enableImageZoom
        ? {
            click: (_view, event) => {
              const target = event.target as HTMLElement | null;
              if (!target || target.tagName !== "IMG") return false;
              const img = target as HTMLImageElement;
              const src = img.currentSrc || img.src;
              if (!src) return false;
              event.preventDefault();
              event.stopPropagation();
              setLightboxSrc(src);
              setLightboxAlt(img.alt || "");
              return true;
            },
          }
        : undefined,
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = asDoc(content);
    const current = JSON.stringify(editor.getJSON());
    if (current !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-24 animate-pulse rounded-xl bg-charcoal/5",
          className,
        )}
      />
    );
  }

  return (
    <div className={cn("tiptap-viewer", className)}>
      <EditorContent editor={editor} />
      {enableImageZoom ? (
        <ImageLightbox
          key={lightboxSrc ?? "closed"}
          src={lightboxSrc}
          alt={lightboxAlt}
          open={Boolean(lightboxSrc)}
          onOpenChange={(open) => {
            if (!open) {
              setLightboxSrc(null);
              setLightboxAlt("");
            }
          }}
        />
      ) : null}
    </div>
  );
}
