"use client";

import type { JSONContent } from "@tiptap/react";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Save,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  EMPTY_TIPTAP_DOC,
  MaterialTiptapEditor,
} from "@/components/admin/materials/material-tiptap-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import {
  CMS_IMAGE_ACCEPT,
  CMS_IMAGE_MAX_BYTES,
  CMS_IMAGE_MIME,
  excerptFromBody,
} from "@/lib/materials/plain-text";
import { previewMaterialSlug } from "@/lib/materials/slug";
import type {
  MaterialDetail,
  MaterialStatus,
  MaterialTag,
  MaterialTagInput,
  MaterialVisibility,
} from "@/lib/materials/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { materialUpsertSchema } from "@/lib/validations/materials";

const FIELD_INPUT_CLASS =
  "h-12 rounded-2xl border-charcoal/12 bg-white text-base font-semibold text-ink shadow-sm placeholder:text-charcoal/38 placeholder:font-medium";
const FIELD_HINT_CLASS = "text-[11px] leading-relaxed text-charcoal/50";
const FIELD_ERROR_CLASS = "text-[11px] font-medium text-destructive";

type LocaleKey = "id" | "en";

type LocaleDraft = {
  title: string;
  body: JSONContent;
};

type Snapshot = {
  locales: Record<LocaleKey, LocaleDraft>;
  visibility: MaterialVisibility;
  status: MaterialStatus;
  featured: boolean;
  coverObjectKey: string | null;
  tags: MaterialTagInput[];
};

type Props = {
  mode: "create" | "edit";
  materialId?: string;
};

function emptyLocale(): LocaleDraft {
  return { title: "", body: EMPTY_TIPTAP_DOC };
}

function tagKey(tag: { nameId: string; slug?: string | null }) {
  const raw = (tag.slug || tag.nameId).trim().toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function tagDisplayName(
  tag: { nameId: string; nameEn?: string | null },
  lang: LocaleKey,
) {
  if (lang === "en") return (tag.nameEn || tag.nameId).trim();
  return (tag.nameId || tag.nameEn || "").trim();
}

function createTagFromQuery(query: string, lang: LocaleKey): MaterialTagInput {
  const name = query.trim();
  // Seed both locales so public ID/EN switch works immediately; refine via edit fields.
  if (lang === "en") {
    return { nameId: name, nameEn: name };
  }
  return { nameId: name, nameEn: name };
}

function normalizeSelectedTags(tags: MaterialTagInput[]): MaterialTagInput[] {
  const seen = new Set<string>();
  const out: MaterialTagInput[] = [];
  for (const tag of tags) {
    const nameId = tag.nameId.trim();
    if (!nameId) continue;
    const key = tagKey({ nameId, slug: tag.slug });
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      nameId,
      nameEn: (tag.nameEn ?? "").trim(),
      slug: tag.slug?.trim() || undefined,
    });
    if (out.length >= 5) break;
  }
  return out;
}

function snapshotKey(s: Snapshot): string {
  return JSON.stringify({
    locales: {
      id: {
        title: s.locales.id.title,
        body: s.locales.id.body,
      },
      en: {
        title: s.locales.en.title,
        body: s.locales.en.body,
      },
    },
    visibility: s.visibility,
    status: s.status,
    featured: s.featured,
    coverObjectKey: s.coverObjectKey,
    tags: normalizeSelectedTags(s.tags),
  });
}

export function MaterialEditor({ mode, materialId }: Props) {
  const t = useTranslations("adminMaterials");
  const locale = useLocale();
  const router = useRouter();

  const [activeLocale, setActiveLocale] = useState<LocaleKey>(
    locale === "en" ? "en" : "id",
  );
  const [locales, setLocales] = useState<Record<LocaleKey, LocaleDraft>>({
    id: emptyLocale(),
    en: emptyLocale(),
  });
  const [visibility, setVisibility] =
    useState<MaterialVisibility>("STUDENT");
  const [status, setStatus] = useState<MaterialStatus>("DRAFT");
  const [featured, setFeatured] = useState(false);
  const [coverObjectKey, setCoverObjectKey] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  /** Once a material leaves DRAFT on the server, slug stays immutable. */
  const [slugLocked, setSlugLocked] = useState(false);
  const [tags, setTags] = useState<MaterialTagInput[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<MaterialTag[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [tagDeleteTarget, setTagDeleteTarget] = useState<MaterialTag | null>(
    null,
  );
  const [titleTouched, setTitleTouched] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(() =>
    mode === "create"
      ? snapshotKey({
          locales: { id: emptyLocale(), en: emptyLocale() },
          visibility: "STUDENT",
          status: "DRAFT",
          featured: false,
          coverObjectKey: null,
          tags: [],
        })
      : null,
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [removeCoverOpen, setRemoveCoverOpen] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const allowLeaveRef = useRef(false);
  const pendingSaveRef = useRef<ReturnType<
    typeof materialUpsertSchema.safeParse
  > | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const tagBoxRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const cleanTokenRef = useRef(0);

  const currentSnapshot = useMemo(
    (): Snapshot => ({
      locales,
      visibility,
      status,
      featured,
      coverObjectKey,
      tags,
    }),
    [locales, visibility, status, featured, coverObjectKey, tags],
  );

  useEffect(() => {
    snapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  const dirty =
    baseline !== null && snapshotKey(currentSnapshot) !== baseline;

  function markEditorClean() {
    const token = ++cleanTokenRef.current;
    const first = snapshotRef.current;
    if (first) setBaseline(snapshotKey(first));
    window.setTimeout(() => {
      if (token !== cleanTokenRef.current) return;
      const next = snapshotRef.current;
      if (next) setBaseline(snapshotKey(next));
    }, 150);
  }

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    function onDocumentClick(event: MouseEvent) {
      if (allowLeaveRef.current) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pendingHrefRef.current = href;
      setLeaveOpen(true);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [dirty]);

  useEffect(() => {
    if (mode !== "edit" || !materialId) return;
    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/materials/${encodeURIComponent(materialId)}`,
          { credentials: "same-origin", signal: controller.signal },
        );
        const payload = (await res.json()) as {
          success?: boolean;
          data?: MaterialDetail;
          error?: { code?: string };
        };
        if (!res.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.code ?? "NOT_FOUND");
        }
        const detail = payload.data;
        const nextLocales: Record<LocaleKey, LocaleDraft> = {
          id: emptyLocale(),
          en: emptyLocale(),
        };
        for (const loc of detail.locales) {
          if (loc.locale !== "id" && loc.locale !== "en") continue;
          nextLocales[loc.locale] = {
            title: loc.title ?? "",
            body:
              loc.body &&
              typeof loc.body === "object" &&
              (loc.body as JSONContent).type === "doc"
                ? (loc.body as JSONContent)
                : EMPTY_TIPTAP_DOC,
          };
        }
        const nextTags = normalizeSelectedTags(
          detail.tags.map((tag) => ({
            nameId: tag.nameId,
            nameEn: tag.nameEn,
            slug: tag.slug,
          })),
        );
        const nextVisibility =
          detail.visibility === "PUBLIC" ? "PUBLIC" : "STUDENT";
        const nextStatus =
          detail.status === "PUBLISHED"
            ? "PUBLISHED"
            : detail.status === "ARCHIVED"
              ? "ARCHIVED"
              : "DRAFT";
        const nextFeatured = Boolean(detail.featured);
        const nextCover = detail.coverObjectKey;

        setLocales(nextLocales);
        setVisibility(nextVisibility);
        setStatus(nextStatus);
        setFeatured(nextFeatured);
        setCoverObjectKey(nextCover);
        setCoverUrl(detail.coverUrl);
        setSlug(detail.slug);
        setSlugLocked(detail.status !== "DRAFT");
        setTags(nextTags);
        setBaseline(
          snapshotKey({
            locales: nextLocales,
            visibility: nextVisibility,
            status: nextStatus,
            featured: nextFeatured,
            coverObjectKey: nextCover,
            tags: nextTags,
          }),
        );
        window.setTimeout(() => {
          const next = snapshotRef.current;
          if (next) setBaseline(snapshotKey(next));
        }, 150);
      } catch {
        if (controller.signal.aborted) return;
        toast.error(t("errors.loadDetail"));
        allowLeaveRef.current = true;
        router.replace("/admin/materials");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [mode, materialId, router, t]);

  useEffect(() => {
    const q = tagQuery.trim();
    if (!tagOpen) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setTagLoading(true);
        try {
          const params = new URLSearchParams({
            q,
            limit: "40",
          });
          const res = await fetch(
            `/api/admin/materials/tags?${params.toString()}`,
            { credentials: "same-origin" },
          );
          const payload = (await res.json()) as {
            success?: boolean;
            data?: { items: MaterialTag[] };
          };
          if (!res.ok || !payload.success || !payload.data) {
            setTagSuggestions([]);
            return;
          }
          setTagSuggestions(payload.data.items ?? []);
        } catch {
          setTagSuggestions([]);
        } finally {
          setTagLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [tagQuery, tagOpen]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!tagBoxRef.current?.contains(event.target as Node)) {
        setTagOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function updateLocale(key: LocaleKey, patch: Partial<LocaleDraft>) {
    setLocales((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function addTag(input: MaterialTagInput) {
    const next = normalizeSelectedTags([...tags, input]);
    if (next.length === tags.length && tags.length >= 5) {
      toast.error(t("errors.tagsMax"));
      return;
    }
    if (next.length === tags.length) {
      toast.error(t("errors.tagDuplicate"));
      return;
    }
    setTags(next);
    setTagQuery("");
    setTagOpen(false);
  }

  function updateTagNames(
    index: number,
    patch: Partial<Pick<MaterialTagInput, "nameId" | "nameEn">>,
  ) {
    setTags((prev) =>
      prev.map((tag, i) => (i === index ? { ...tag, ...patch } : tag)),
    );
  }

  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
    setEditingTagIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  async function deleteCatalogTag(tag: MaterialTag) {
    setDeletingTagId(tag.id);
    try {
      const res = await fetch(
        `/api/admin/materials/tags/${encodeURIComponent(tag.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const payload = (await res.json()) as {
        success?: boolean;
        error?: { code?: string };
      };
      if (!res.ok || !payload.success) {
        const code = payload.error?.code ?? "ACTION_FAILED";
        toast.error(t(`errors.${code}` as "errors.ACTION_FAILED"));
        return;
      }
      setTagSuggestions((prev) => prev.filter((item) => item.id !== tag.id));
      setTags((prev) =>
        prev.filter(
          (item) =>
            tagKey(item) !== tagKey({ nameId: tag.nameId, slug: tag.slug }),
        ),
      );
      toast.success(t("toast.tagDeleted"));
      setTagDeleteTarget(null);
    } catch {
      toast.error(t("errors.ACTION_FAILED"));
    } finally {
      setDeletingTagId(null);
    }
  }

  function confirmLeave() {
    const href = pendingHrefRef.current;
    setLeaveOpen(false);
    pendingHrefRef.current = null;
    if (!href) return;
    allowLeaveRef.current = true;
    window.location.assign(href);
  }

  async function uploadCover(file: File) {
    if (!CMS_IMAGE_MIME.has(file.type)) {
      toast.error(t("errors.COVER_TYPE_INVALID"));
      return;
    }
    if (file.size <= 0 || file.size > CMS_IMAGE_MAX_BYTES) {
      toast.error(t("errors.COVER_SIZE_INVALID"));
      return;
    }
    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (coverObjectKey) {
        form.append("previousObjectKey", coverObjectKey);
      }
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
      setCoverObjectKey(payload.data.objectKey);
      setCoverUrl(payload.data.publicUrl);
      toast.success(t("toast.coverUploaded"));
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "COVER_UPLOAD_FAILED";
      toast.error(
        t(`errors.${code}` as "errors.COVER_UPLOAD_FAILED"),
      );
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setFieldError(null);
    const localePayload = (["id", "en"] as const)
      .map((key) => ({
        locale: key,
        title: locales[key].title.trim(),
        excerpt: excerptFromBody(locales[key].body),
        body: locales[key].body ?? EMPTY_TIPTAP_DOC,
      }))
      .filter((loc) => loc.title.length > 0);

    const parsed = materialUpsertSchema.safeParse({
      visibility,
      status,
      featured: visibility === "PUBLIC" ? featured : false,
      coverObjectKey,
      locales: localePayload.length
        ? localePayload
        : [
            {
              locale: activeLocale,
              title: locales[activeLocale].title,
              excerpt: excerptFromBody(locales[activeLocale].body),
              body: locales[activeLocale].body,
            },
          ],
      tags: normalizeSelectedTags(tags),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue?.message ?? t("errors.VALIDATION_ERROR");
      setFieldError(message);
      setTitleTouched(true);
      toast.error(t("errors.VALIDATION_ERROR"));
      return;
    }

    pendingSaveRef.current = parsed;
    setSaveConfirmOpen(true);
  }

  async function confirmSave() {
    const parsed = pendingSaveRef.current;
    if (!parsed?.success) {
      setSaveConfirmOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res =
        mode === "create"
          ? await fetch("/api/admin/materials", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.data),
            })
          : await fetch(
              `/api/admin/materials/${encodeURIComponent(materialId!)}`,
              {
                method: "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed.data),
              },
            );

      const payload = (await res.json()) as {
        success?: boolean;
        data?: MaterialDetail;
        error?: { code?: string; message?: string };
      };

      if (!res.ok || !payload.success || !payload.data) {
        const code = payload.error?.code ?? "ACTION_FAILED";
        toast.error(t(`errors.${code}` as "errors.ACTION_FAILED"));
        return;
      }

      toast.success(
        mode === "create" ? t("toast.created") : t("toast.updated"),
      );

      const savedLocales: Record<LocaleKey, LocaleDraft> = {
        id: emptyLocale(),
        en: emptyLocale(),
      };
      for (const loc of payload.data.locales) {
        if (loc.locale !== "id" && loc.locale !== "en") continue;
        savedLocales[loc.locale] = {
          title: loc.title ?? "",
          body:
            loc.body &&
            typeof loc.body === "object" &&
            (loc.body as JSONContent).type === "doc"
              ? (loc.body as JSONContent)
              : EMPTY_TIPTAP_DOC,
        };
      }
      const savedTags = normalizeSelectedTags(
        payload.data.tags.map((tag) => ({
          nameId: tag.nameId,
          nameEn: tag.nameEn,
          slug: tag.slug,
        })),
      );
      // Keep TipTap JSON from the client so dirty detection matches the live editor.
      const cleanLocales: Record<LocaleKey, LocaleDraft> = {
        id: {
          title: savedLocales.id.title || locales.id.title,
          body: locales.id.body,
        },
        en: {
          title: savedLocales.en.title || locales.en.title,
          body: locales.en.body,
        },
      };
      const nextVisibility =
        payload.data.visibility === "PUBLIC" ? "PUBLIC" : "STUDENT";
      const nextStatus =
        payload.data.status === "PUBLISHED"
          ? "PUBLISHED"
          : payload.data.status === "ARCHIVED"
            ? "ARCHIVED"
            : "DRAFT";
      const nextFeatured = Boolean(payload.data.featured);
      const nextCover = payload.data.coverObjectKey;

      setLocales(cleanLocales);
      setTags(savedTags);
      setFeatured(nextFeatured);
      setVisibility(nextVisibility);
      setStatus(nextStatus);
      setSlug(payload.data.slug);
      setSlugLocked(payload.data.status !== "DRAFT");
      setCoverObjectKey(nextCover);
      setCoverUrl(payload.data.coverUrl);
      setBaseline(
        snapshotKey({
          locales: cleanLocales,
          visibility: nextVisibility,
          status: nextStatus,
          featured: nextFeatured,
          coverObjectKey: nextCover,
          tags: savedTags,
        }),
      );
      markEditorClean();
      setSaveConfirmOpen(false);
      pendingSaveRef.current = null;

      if (mode === "create") {
        allowLeaveRef.current = true;
        router.replace(`/admin/materials/${payload.data.id}`);
      }
    } catch {
      toast.error(t("errors.ACTION_FAILED"));
    } finally {
      setSaving(false);
    }
  }

  const draft = locales[activeLocale];
  const coverPreview = toBrowserMediaUrl(coverUrl ?? coverObjectKey);
  /** Active tab title drives the live preview when switching ID/EN. */
  const activeTitle = draft.title.trim();
  /**
   * Canonical public URL slug prefers Indonesia, then English — one shared path
   * so locale switcher keeps `/news/{slug}` stable across languages.
   */
  const canonicalTitle =
    locales.id.title.trim() || locales.en.title.trim() || activeTitle;
  const activeLiveSlug = activeTitle
    ? previewMaterialSlug(activeTitle)
    : null;
  const canonicalLiveSlug = canonicalTitle
    ? previewMaterialSlug(canonicalTitle)
    : null;
  const displaySlug = slugLocked
    ? (slug ?? canonicalLiveSlug)
    : (activeLiveSlug ?? slug ?? null);
  const sharedSlugPreview = slugLocked
    ? (slug ?? canonicalLiveSlug)
    : canonicalLiveSlug;
  const showSharedSlugHint =
    !slugLocked &&
    Boolean(sharedSlugPreview) &&
    Boolean(activeLiveSlug) &&
    sharedSlugPreview !== activeLiveSlug;
  const titleInvalid =
    titleTouched && draft.title.trim().length === 0;
  const canCreateTag =
    tagQuery.trim().length > 0 &&
    !tagSuggestions.some(
      (s) => tagKey(s) === tagKey({ nameId: tagQuery }),
    );

  const visibilityOptions = [
    { value: "STUDENT", label: t("visibility.STUDENT") },
    { value: "PUBLIC", label: t("visibility.PUBLIC") },
  ];
  const statusOptions = [
    { value: "DRAFT", label: t("status.DRAFT") },
    { value: "PUBLISHED", label: t("status.PUBLISHED") },
    { value: "ARCHIVED", label: t("status.ARCHIVED") },
  ];

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[96rem] space-y-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-charcoal/10" />
          <div className="h-12 w-full max-w-xl animate-pulse rounded-2xl bg-charcoal/10" />
          <div className="h-[420px] w-full animate-pulse rounded-[1.35rem] bg-charcoal/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-seigaiha opacity-[0.16]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <header className="mb-5 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              href="/admin/materials"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-fit cursor-pointer rounded-xl px-2.5 font-semibold text-charcoal/70",
              )}
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              {t("actions.backToList")}
            </Link>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
                {t("eyebrow")}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {mode === "create" ? t("editor.createTitle") : t("editor.editTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-charcoal/70">
                {t("editor.subtitle")}
              </p>
            </div>
          </div>

          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-11 cursor-pointer rounded-2xl px-5 font-semibold"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {saving
              ? t("actions.saving")
              : mode === "create"
                ? t("actions.create")
                : t("actions.save")}
          </Button>
        </header>

        {fieldError ? (
          <p className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {fieldError}
          </p>
        ) : null}

        <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-4">
            <div
              className="inline-flex rounded-2xl border border-charcoal/10 bg-white/80 p-1 shadow-sm"
              role="tablist"
              aria-label={t("editor.localeTabs")}
            >
              {(["id", "en"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeLocale === key}
                  onClick={() => setActiveLocale(key)}
                  className={cn(
                    "inline-flex h-9 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold transition-all",
                    activeLocale === key
                      ? "bg-ink text-white shadow-sm"
                      : "text-charcoal/65 hover:bg-soft hover:text-ink",
                  )}
                >
                  {t(`editor.locale.${key}`)}
                  {locales[key].title.trim() ? (
                    <span className="ml-2 size-1.5 rounded-full bg-brand" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-elevated)] p-4 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.35)] sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="material-title">{t("fields.title")}</Label>
                <Input
                  id="material-title"
                  value={draft.title}
                  onChange={(e) =>
                    updateLocale(activeLocale, { title: e.target.value })
                  }
                  onBlur={() => setTitleTouched(true)}
                  placeholder={t("editor.titlePlaceholder")}
                  className={cn(
                    FIELD_INPUT_CLASS,
                    titleInvalid &&
                      "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/25",
                  )}
                  maxLength={200}
                  aria-invalid={titleInvalid}
                  aria-describedby="material-title-hint"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    id="material-title-hint"
                    className={titleInvalid ? FIELD_ERROR_CLASS : FIELD_HINT_CLASS}
                  >
                    {titleInvalid
                      ? t("editor.titleRequired")
                      : t("editor.titleHint")}
                  </p>
                  <span className={FIELD_HINT_CLASS}>
                    {draft.title.trim().length}/200
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.slug")}
                    </span>
                    <span className="rounded-full border border-charcoal/10 bg-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-charcoal/55 uppercase">
                      {t(`editor.locale.${activeLocale}`)}
                    </span>
                    <span
                      className="inline-flex max-w-full items-center rounded-full border border-charcoal/10 bg-white/90 px-2.5 py-1 text-xs font-medium text-charcoal/70"
                      title={
                        slugLocked
                          ? t("editor.slugLockedHint")
                          : t("editor.slugLiveHint")
                      }
                    >
                      {displaySlug ? (
                        <code className="truncate font-semibold text-ink">
                          {displaySlug}
                        </code>
                      ) : (
                        <span className="text-charcoal/45">
                          {t("editor.slugAuto")}
                        </span>
                      )}
                    </span>
                  </div>
                  {slugLocked ? (
                    <p className={FIELD_HINT_CLASS}>
                      {t("editor.slugLockedHint")}
                    </p>
                  ) : showSharedSlugHint ? (
                    <p className={FIELD_HINT_CLASS}>
                      {t("editor.slugSharedHint", {
                        slug: sharedSlugPreview ?? "",
                      })}
                    </p>
                  ) : (
                    <p className={FIELD_HINT_CLASS}>
                      {t("editor.slugLiveHint")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.body")}</Label>
                <p className={FIELD_HINT_CLASS}>{t("editor.bodyHint")}</p>
                <MaterialTiptapEditor
                  key={activeLocale}
                  content={draft.body}
                  onChange={(body) => {
                    setLocales((prev) => {
                      if (
                        JSON.stringify(prev[activeLocale].body) ===
                        JSON.stringify(body)
                      ) {
                        return prev;
                      }
                      return {
                        ...prev,
                        [activeLocale]: { ...prev[activeLocale], body },
                      };
                    });
                  }}
                  placeholder={t("editor.bodyPlaceholder")}
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <div className="space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-elevated)] p-4 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.35)] sm:p-5">
              <div className="space-y-2">
                <Label>{t("fields.cover")}</Label>
                <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
                  <div className="relative w-full overflow-hidden bg-soft aspect-video">
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPreview}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-charcoal/40">
                        <ImageIcon className="size-8 sm:size-9" aria-hidden />
                        <span className="text-xs font-medium">
                          {t("editor.coverEmpty")}
                        </span>
                        <span className="text-[10px] tracking-wide text-charcoal/35 uppercase">
                          16:9 · 1600×900
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 p-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingCover}
                      className="h-10 flex-1 cursor-pointer rounded-xl font-semibold"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {uploadingCover ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ImageIcon className="size-4" aria-hidden />
                      )}
                      {coverPreview
                        ? t("actions.replaceCover")
                        : t("actions.uploadCover")}
                    </Button>
                    {coverPreview ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 cursor-pointer rounded-xl"
                        aria-label={t("actions.removeCover")}
                        title={t("actions.removeCover")}
                        onClick={() => setRemoveCoverOpen(true)}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                  <p className="border-t border-charcoal/8 px-3 py-2 text-[11px] leading-relaxed text-charcoal/50">
                    {t("editor.coverHint")}
                  </p>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept={CMS_IMAGE_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadCover(file);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.visibility")}</Label>
                <FilterSelect
                  value={visibility}
                  onValueChange={(next) => {
                    const value = next as MaterialVisibility;
                    setVisibility(value);
                    if (value !== "PUBLIC") setFeatured(false);
                  }}
                  options={visibilityOptions}
                  ariaLabel={t("fields.visibility")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.status")}</Label>
                <FilterSelect
                  value={status}
                  onValueChange={(next) => setStatus(next as MaterialStatus)}
                  options={statusOptions}
                  ariaLabel={t("fields.status")}
                />
              </div>

              <label
                className={cn(
                  "flex items-start gap-3 rounded-2xl border border-charcoal/10 bg-white/80 px-3.5 py-3",
                  visibility !== "PUBLIC" && "opacity-55",
                )}
              >
                <input
                  type="checkbox"
                  checked={featured}
                  disabled={visibility !== "PUBLIC"}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="mt-1 size-4 cursor-pointer accent-[var(--brand)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Star className="size-3.5 text-[var(--warning)]" aria-hidden />
                    {t("fields.featured")}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-charcoal/60">
                    {t("editor.featuredHint")}
                  </span>
                </span>
              </label>

              <div className="space-y-2" ref={tagBoxRef}>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="material-tags">{t("fields.tags")}</Label>
                  <span className="rounded-full border border-charcoal/10 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-charcoal/55 uppercase">
                    {t(`editor.locale.${activeLocale}`)}
                  </span>
                </div>
                <p className={FIELD_HINT_CLASS}>
                  {t("editor.tagsHint", { count: tags.length, max: 5 })}
                </p>
                <p className={FIELD_HINT_CLASS}>{t("editor.tagsLocaleHint")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, index) => (
                    <button
                      key={`${tagKey(tag)}-${index}`}
                      type="button"
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                        editingTagIndex === index
                          ? "border-brand/40 bg-brand/5 text-ink"
                          : "border-charcoal/12 bg-white text-ink hover:border-brand/25",
                      )}
                      onClick={() =>
                        setEditingTagIndex((current) =>
                          current === index ? null : index,
                        )
                      }
                      title={`${tag.nameId} / ${tag.nameEn || "—"}`}
                    >
                      <Tag className="size-3 text-charcoal/45" aria-hidden />
                      {tagDisplayName(tag, activeLocale)}
                      <span
                        role="button"
                        tabIndex={0}
                        className="rounded-full p-0.5 text-charcoal/45 hover:bg-soft hover:text-ink"
                        aria-label={t("actions.removeTag")}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(index);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            removeTag(index);
                          }
                        }}
                      >
                        <X className="size-3" aria-hidden />
                      </span>
                    </button>
                  ))}
                </div>
                {editingTagIndex !== null && tags[editingTagIndex] ? (
                  <div className="space-y-2 rounded-2xl border border-charcoal/10 bg-white/90 p-3">
                    <p className="text-[11px] font-semibold tracking-wide text-charcoal/50 uppercase">
                      {t("editor.tagEditTitle")}
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="tag-name-id" className="text-xs">
                        {t("editor.tagNameId")}
                      </Label>
                      <Input
                        id="tag-name-id"
                        value={tags[editingTagIndex].nameId}
                        onChange={(e) =>
                          updateTagNames(editingTagIndex, {
                            nameId: e.target.value,
                          })
                        }
                        placeholder={t("editor.tagNameIdPlaceholder")}
                        className="h-10 rounded-xl border-charcoal/12 bg-white placeholder:text-charcoal/38"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tag-name-en" className="text-xs">
                        {t("editor.tagNameEn")}
                      </Label>
                      <Input
                        id="tag-name-en"
                        value={tags[editingTagIndex].nameEn ?? ""}
                        onChange={(e) =>
                          updateTagNames(editingTagIndex, {
                            nameEn: e.target.value,
                          })
                        }
                        placeholder={t("editor.tagNameEnPlaceholder")}
                        className="h-10 rounded-xl border-charcoal/12 bg-white placeholder:text-charcoal/38"
                        maxLength={80}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="relative">
                  <Input
                    id="material-tags"
                    value={tagQuery}
                    disabled={tags.length >= 5}
                    onFocus={() => setTagOpen(true)}
                    onChange={(e) => {
                      setTagQuery(e.target.value);
                      setTagOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (tagQuery.trim()) {
                          addTag(createTagFromQuery(tagQuery, activeLocale));
                        }
                      }
                    }}
                    placeholder={t("editor.tagPlaceholderLocale", {
                      locale: t(`editor.locale.${activeLocale}`),
                    })}
                    className={cn(
                      "h-11 rounded-2xl border-charcoal/12 bg-white shadow-sm placeholder:text-charcoal/38",
                    )}
                    maxLength={80}
                    aria-describedby="material-tags-hint"
                  />
                  <p id="material-tags-hint" className={cn(FIELD_HINT_CLASS, "mt-1.5")}>
                    {t("editor.tagsFormatHint")}
                  </p>
                  {tagOpen ? (
                    <div className="absolute bottom-full z-30 mb-1.5 max-h-64 w-full overflow-auto rounded-2xl border border-charcoal/10 bg-white p-1.5 shadow-xl">
                      {tagLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2
                            className="size-4 animate-spin text-brand"
                            aria-hidden
                          />
                        </div>
                      ) : (
                        <>
                          {tagSuggestions.map((suggestion) => {
                            const inUse = (suggestion.usageCount ?? 0) > 0;
                            return (
                              <div
                                key={suggestion.id}
                                className="flex items-center gap-1 rounded-xl hover:bg-soft"
                              >
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm"
                                  onClick={() =>
                                    addTag({
                                      nameId: suggestion.nameId,
                                      nameEn: suggestion.nameEn,
                                      slug: suggestion.slug,
                                    })
                                  }
                                >
                                  <Tag
                                    className="size-3.5 shrink-0 text-charcoal/40"
                                    aria-hidden
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-ink">
                                      {tagDisplayName(suggestion, activeLocale)}
                                    </span>
                                    <span className="block truncate text-xs text-charcoal/50">
                                      ID: {suggestion.nameId}
                                      {suggestion.nameEn
                                        ? ` · EN: ${suggestion.nameEn}`
                                        : ""}
                                      {inUse
                                        ? ` · ${t("editor.tagInUse", {
                                            count: suggestion.usageCount ?? 0,
                                          })}`
                                        : ` · ${t("editor.tagUnused")}`}
                                    </span>
                                  </span>
                                </button>
                                {!inUse ? (
                                  <button
                                    type="button"
                                    className="mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-charcoal/40 hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={t("actions.deleteTag")}
                                    title={t("actions.deleteTag")}
                                    disabled={deletingTagId === suggestion.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setTagDeleteTarget(suggestion);
                                    }}
                                  >
                                    {deletingTagId === suggestion.id ? (
                                      <Loader2
                                        className="size-3.5 animate-spin"
                                        aria-hidden
                                      />
                                    ) : (
                                      <Trash2 className="size-3.5" aria-hidden />
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                          {canCreateTag ? (
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand hover:bg-brand/5"
                              onClick={() =>
                                addTag(
                                  createTagFromQuery(tagQuery, activeLocale),
                                )
                              }
                            >
                              {t("editor.createTag", { name: tagQuery.trim() })}
                            </button>
                          ) : null}
                          {!tagLoading &&
                          tagSuggestions.length === 0 &&
                          !canCreateTag ? (
                            <p className="px-3 py-3 text-xs text-charcoal/55">
                              {t("editor.noTagSuggestions")}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AdminConfirmDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            pendingHrefRef.current = null;
          }
          setLeaveOpen(open);
        }}
        title={t("confirm.unsavedTitle")}
        description={t("confirm.unsavedBody")}
        confirmLabel={t("confirm.unsavedConfirm")}
        cancelLabel={t("actions.cancel")}
        tone="danger"
        onConfirm={confirmLeave}
      />

      <AdminConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={(open) => {
          if (saving) return;
          if (!open) pendingSaveRef.current = null;
          setSaveConfirmOpen(open);
        }}
        title={
          mode === "create"
            ? t("confirm.saveCreateTitle")
            : t("confirm.saveUpdateTitle")
        }
        description={
          mode === "create"
            ? t("confirm.saveCreateBody")
            : t("confirm.saveUpdateBody", {
                status: t(`status.${status}`),
              })
        }
        confirmLabel={
          mode === "create" ? t("actions.create") : t("actions.save")
        }
        cancelLabel={t("actions.cancel")}
        pending={saving}
        pendingLabel={t("actions.saving")}
        onConfirm={() => void confirmSave()}
      />

      <AdminConfirmDialog
        open={removeCoverOpen}
        onOpenChange={(open) => {
          if (!open) setRemoveCoverOpen(false);
        }}
        title={t("confirm.removeCoverTitle")}
        description={t("confirm.removeCoverBody")}
        confirmLabel={t("actions.removeCover")}
        cancelLabel={t("actions.cancel")}
        tone="danger"
        onConfirm={() => {
          setCoverObjectKey(null);
          setCoverUrl(null);
          setRemoveCoverOpen(false);
          toast.success(t("toast.coverRemoved"));
        }}
      />

      <AdminConfirmDialog
        open={Boolean(tagDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingTagId) setTagDeleteTarget(null);
        }}
        title={t("confirm.deleteTagTitle")}
        description={t("confirm.deleteTagBody", {
          name:
            locale === "en"
              ? tagDeleteTarget?.nameEn || tagDeleteTarget?.nameId || ""
              : tagDeleteTarget?.nameId || "",
        })}
        confirmLabel={t("confirm.deleteTagConfirm")}
        cancelLabel={t("actions.cancel")}
        pending={Boolean(deletingTagId)}
        pendingLabel={t("actions.deleting")}
        tone="danger"
        onConfirm={() => {
          if (tagDeleteTarget) void deleteCatalogTag(tagDeleteTarget);
        }}
      />
    </div>
  );
}
