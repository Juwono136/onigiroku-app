"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  Bold,
  Columns2,
  Grid2X2X,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Rows3,
  SeparatorHorizontal,
  TableIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CMS_IMAGE_ACCEPT,
  CMS_IMAGE_MAX_BYTES,
  CMS_IMAGE_MIME,
} from "@/lib/materials/plain-text";
import { cn } from "@/lib/utils";

export const EMPTY_TIPTAP_DOC: JSONContent = { type: "doc", content: [] };

type Props = {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function uploadCmsMedia(
  file: File,
): Promise<{ objectKey: string; publicUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/materials/cover", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const payload = (await res.json()) as {
    success?: boolean;
    data?: { objectKey: string; publicUrl: string };
    error?: { code?: string };
  };
  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.code ?? "COVER_UPLOAD_FAILED");
  }
  return payload.data;
}

export function MaterialTiptapEditor({
  content,
  onChange,
  placeholder,
  className,
  disabled = false,
}: Props) {
  const t = useTranslations("adminMaterials");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const suppressUpdateRef = useRef(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkHasExisting, setLinkHasExisting] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
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
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          class: "text-brand underline underline-offset-2",
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-xl w-full max-w-full h-auto",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? t("editor.bodyPlaceholder"),
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "material-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content?.type ? content : EMPTY_TIPTAP_DOC,
    onCreate: () => {
      // Ignore the first document normalization so parent dirty state stays clean.
      suppressUpdateRef.current = true;
      window.setTimeout(() => {
        suppressUpdateRef.current = false;
      }, 0);
    },
    onUpdate: ({ editor: next }) => {
      if (suppressUpdateRef.current) return;
      onChangeRef.current(next.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "material-prose tiptap-content font-jp min-h-[320px] px-4 py-3 focus:outline-none sm:min-h-[420px] sm:px-5 sm:py-4",
      },
    },
  });

  useEffect(() => {
    if (!editor || disabled === undefined) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  async function handleImagePick(file: File | undefined) {
    if (!file || !editor) return;
    if (!CMS_IMAGE_MIME.has(file.type)) {
      toast.error(t("errors.COVER_TYPE_INVALID"));
      return;
    }
    if (file.size <= 0 || file.size > CMS_IMAGE_MAX_BYTES) {
      toast.error(t("errors.COVER_SIZE_INVALID"));
      return;
    }
    setUploadingImage(true);
    try {
      const uploaded = await uploadCmsMedia(file);
      editor
        .chain()
        .focus()
        .setImage({ src: uploaded.publicUrl, alt: file.name })
        .run();
    } catch {
      toast.error(t("errors.COVER_UPLOAD_FAILED"));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function openLinkDialog() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    setLinkHasExisting(Boolean(previous));
    setLinkValue(previous ?? "https://");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const normalized = normalizeHttpUrl(linkValue);
    if (normalized === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    if (!normalized) {
      setLinkError(t("editor.linkInvalid"));
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
    setLinkOpen(false);
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  if (!editor) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-2xl border border-charcoal/10 bg-white/70",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
      </div>
    );
  }

  const inTable = editor.isActive("table");

  return (
    <div
      className={cn(
        "rounded-b-2xl border border-charcoal/10 bg-white shadow-sm",
        disabled && "opacity-70",
        className,
      )}
    >
      <div className="sticky top-14 z-10 -mx-px flex flex-wrap items-center gap-1 rounded-none border-b border-charcoal/10 bg-[color-mix(in_oklab,var(--workspace-elevated)_96%,white)] px-2 py-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur-md sm:top-16 sm:px-3">
        <ToolbarButton
          label={t("editor.toolbar.h2")}
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.h3")}
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("editor.toolbar.bold")}
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.italic")}
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.underline")}
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("editor.toolbar.bulletList")}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.orderedList")}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.blockquote")}
          active={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.hr")}
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <SeparatorHorizontal className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("editor.toolbar.alignLeft")}
          active={editor.isActive({ textAlign: "left" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.alignCenter")}
          active={editor.isActive({ textAlign: "center" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.alignRight")}
          active={editor.isActive({ textAlign: "right" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("editor.toolbar.link")}
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={openLinkDialog}
        >
          <Link2 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.image")}
          disabled={disabled || uploadingImage}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploadingImage ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ImageIcon className="size-3.5" aria-hidden />
          )}
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("editor.toolbar.insertTable")}
          active={inTable}
          disabled={disabled}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.addColumn")}
          disabled={disabled || !inTable}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <Columns2 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.deleteColumn")}
          disabled={disabled || !inTable}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <BetweenVerticalEnd className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.addRow")}
          disabled={disabled || !inTable}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <Rows3 className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.deleteRow")}
          disabled={disabled || !inTable}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <BetweenHorizontalEnd className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label={t("editor.toolbar.deleteTable")}
          disabled={disabled || !inTable}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Grid2X2X className="size-3.5" aria-hidden />
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept={CMS_IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => void handleImagePick(e.target.files?.[0])}
        />
      </div>
      <EditorContent editor={editor} />
      <p className="border-t border-charcoal/8 px-4 py-2 text-[11px] text-charcoal/50">
        {t("editor.imageHint")}
      </p>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-xl sm:max-w-md"
          showCloseButton
        >
          <DialogHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7 sm:pt-7">
            <DialogTitle className="text-lg font-bold tracking-tight text-ink">
              {t("editor.linkTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-charcoal/70">
              {t("editor.linkDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-6 pb-4 sm:px-7">
            <Label htmlFor="material-link-url">{t("editor.linkUrlLabel")}</Label>
            <Input
              id="material-link-url"
              value={linkValue}
              onChange={(e) => {
                setLinkValue(e.target.value);
                setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
              placeholder={t("editor.linkPlaceholder")}
              className="h-11 rounded-2xl border-charcoal/12 bg-white placeholder:text-charcoal/38"
              autoFocus
              inputMode="url"
              autoComplete="url"
            />
            <p
              className={cn(
                "text-[11px] leading-relaxed",
                linkError ? "font-medium text-destructive" : "text-charcoal/50",
              )}
            >
              {linkError ?? t("editor.linkHint")}
            </p>
          </div>
          <DialogFooter className="gap-2.5 border-t border-charcoal/10 bg-soft/70 px-6 py-5 sm:flex-row sm:justify-between sm:px-7">
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              {linkHasExisting ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 cursor-pointer rounded-xl px-4 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={removeLink}
                >
                  {t("editor.linkRemove")}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 cursor-pointer rounded-xl px-5 font-semibold"
                onClick={() => setLinkOpen(false)}
              >
                {t("actions.cancel")}
              </Button>
              <Button
                type="button"
                className="h-11 cursor-pointer rounded-xl px-5 font-semibold"
                onClick={applyLink}
              >
                {t("editor.linkApply")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 hidden h-5 w-px bg-charcoal/10 sm:block" aria-hidden />;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "size-8 cursor-pointer rounded-lg text-charcoal/70",
        active && "bg-ink/90 text-white hover:bg-ink hover:text-white",
      )}
    >
      {children}
    </Button>
  );
}
