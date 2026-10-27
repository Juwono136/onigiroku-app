"use client";

import { Loader2, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  LearningCategoryTag,
  LearningCategoryTagInput,
} from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type LocaleKey = "id" | "en";

type Props = {
  tags: LearningCategoryTagInput[];
  locale: LocaleKey;
  onChange: (tags: LearningCategoryTagInput[]) => void;
};

const FIELD_HINT_CLASS = "text-[11px] leading-relaxed text-charcoal/50";

function tagKey(tag: { nameId: string; slug?: string | null }) {
  return (tag.slug || tag.nameId).trim().toLowerCase();
}

function tagDisplayName(
  tag: { nameId: string; nameEn?: string | null },
  lang: LocaleKey,
) {
  if (lang === "en") return (tag.nameEn || tag.nameId).trim();
  return (tag.nameId || tag.nameEn || "").trim();
}

function createTagFromQuery(
  query: string,
  lang: LocaleKey,
): LearningCategoryTagInput {
  const name = query.trim();
  if (lang === "en") return { nameId: name, nameEn: name };
  return { nameId: name, nameEn: name };
}

function asTagList(value: unknown): LearningCategoryTag[] {
  if (Array.isArray(value)) return value as LearningCategoryTag[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: LearningCategoryTag[] }).items;
  }
  return [];
}

export function normalizeCategoryTags(
  tags: LearningCategoryTagInput[],
): LearningCategoryTagInput[] {
  const seen = new Set<string>();
  const out: LearningCategoryTagInput[] = [];
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

export function CategoryTagsField({ tags, locale, onChange }: Props) {
  const t = useTranslations("learningAdmin");
  const [tagQuery, setTagQuery] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<LearningCategoryTag[]>(
    [],
  );
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [tagDeleteTarget, setTagDeleteTarget] =
    useState<LearningCategoryTag | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedKeys = useMemo(
    () => new Set(tags.map((tag) => tagKey(tag))),
    [tags],
  );

  const visibleSuggestions = useMemo(
    () =>
      tagSuggestions.filter((suggestion) => {
        const key = tagKey({
          nameId: suggestion.nameId,
          slug: suggestion.slug,
        });
        return key && !selectedKeys.has(key);
      }),
    [selectedKeys, tagSuggestions],
  );

  const canCreateTag = useMemo(() => {
    const q = tagQuery.trim();
    if (!q || tags.length >= 5) return false;
    const key = tagKey({ nameId: q });
    if (selectedKeys.has(key)) return false;
    return !tagSuggestions.some(
      (s) =>
        tagKey({ nameId: s.nameId, slug: s.slug }) === key ||
        s.nameId.toLowerCase() === q.toLowerCase() ||
        s.nameEn.toLowerCase() === q.toLowerCase(),
    );
  }, [selectedKeys, tagQuery, tagSuggestions, tags.length]);

  useEffect(() => {
    if (!tagOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setTagLoading(true);
      const params = new URLSearchParams({
        q: tagQuery.trim(),
        limit: "20",
      });
      void fetch(`/api/admin/materials/tags?${params.toString()}`, {
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then(async (res) => {
          const payload = (await res.json()) as {
            success?: boolean;
            data?: unknown;
          };
          if (!res.ok || !payload.success) throw new Error("tags");
          setTagSuggestions(asTagList(payload.data));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setTagSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setTagLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [tagOpen, tagQuery]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) {
        setTagOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setTagOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function addTag(input: LearningCategoryTagInput) {
    const next = normalizeCategoryTags([...tags, input]);
    if (next.length === tags.length && tags.length >= 5) {
      toast.error(t("errors.tagsMax"));
      return;
    }
    if (next.length === tags.length) return;
    onChange(next);
    setTagQuery("");
    setTagOpen(false);
    setEditingTagIndex(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
    setEditingTagIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  function updateTagNames(
    index: number,
    patch: Partial<Pick<LearningCategoryTagInput, "nameId" | "nameEn">>,
  ) {
    onChange(tags.map((tag, i) => (i === index ? { ...tag, ...patch } : tag)));
  }

  async function confirmDeleteCatalogTag() {
    if (!tagDeleteTarget) return;
    setDeletingTagId(tagDeleteTarget.id);
    try {
      const res = await fetch(
        `/api/admin/materials/tags/${encodeURIComponent(tagDeleteTarget.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!res.ok) {
        const payload = (await res.json()) as { error?: { message?: string } };
        toast.error(payload.error?.message ?? t("errors.tagDelete"));
        return;
      }
      setTagSuggestions((prev) =>
        prev.filter((tag) => tag.id !== tagDeleteTarget.id),
      );
      toast.success(t("toast.tagDeleted"));
      setTagDeleteTarget(null);
    } finally {
      setDeletingTagId(null);
    }
  }

  const atLimit = tags.length >= 5;
  const showEmpty =
    !tagLoading && visibleSuggestions.length === 0 && !canCreateTag;

  return (
    <div className="space-y-2.5" ref={boxRef}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="category-tags">{t("fields.tags")}</Label>
        <span className="rounded-full border border-charcoal/10 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-charcoal/55 uppercase">
          {t(`tabs.${locale}`)}
        </span>
      </div>
      <p className={FIELD_HINT_CLASS}>
        {t("editor.tagsHint", { count: tags.length, max: 5 })}
      </p>
      <p className={FIELD_HINT_CLASS}>{t("editor.tagsLocaleHint")}</p>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <button
              key={`${tagKey(tag)}-${index}`}
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                editingTagIndex === index
                  ? "border-brand/40 bg-brand/5 text-ink ring-2 ring-brand/15"
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
              {tagDisplayName(tag, locale)}
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
      ) : null}

      {editingTagIndex !== null && tags[editingTagIndex] ? (
        <div className="space-y-2 rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)]/80 p-3">
          <p className="text-[11px] font-semibold tracking-wide text-charcoal/50 uppercase">
            {t("editor.tagEditTitle")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-tag-name-id" className="text-xs">
                {t("editor.tagNameId")}
              </Label>
              <Input
                id="cat-tag-name-id"
                value={tags[editingTagIndex].nameId}
                onChange={(e) =>
                  updateTagNames(editingTagIndex, { nameId: e.target.value })
                }
                placeholder={t("editor.tagNameIdPlaceholder")}
                className="h-10 rounded-xl border-charcoal/12 bg-white placeholder:text-charcoal/38"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-tag-name-en" className="text-xs">
                {t("editor.tagNameEn")}
              </Label>
              <Input
                id="cat-tag-name-en"
                value={tags[editingTagIndex].nameEn ?? ""}
                onChange={(e) =>
                  updateTagNames(editingTagIndex, { nameEn: e.target.value })
                }
                placeholder={t("editor.tagNameEnPlaceholder")}
                className="h-10 rounded-xl border-charcoal/12 bg-white placeholder:text-charcoal/38"
                maxLength={80}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
            aria-hidden
          />
          <Input
            ref={inputRef}
            id="category-tags"
            value={tagQuery}
            disabled={atLimit}
            onFocus={() => setTagOpen(true)}
            onChange={(e) => {
              setTagQuery(e.target.value);
              setTagOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (tagQuery.trim()) {
                  addTag(createTagFromQuery(tagQuery, locale));
                }
              }
            }}
            placeholder={
              atLimit ? t("editor.tagsHint", { count: 5, max: 5 }) : t("editor.tagPlaceholder")
            }
            className="h-11 rounded-2xl border-charcoal/12 bg-white pl-10 shadow-sm placeholder:text-charcoal/38"
            maxLength={80}
            aria-expanded={tagOpen}
            aria-controls="category-tags-menu"
            aria-autocomplete="list"
            aria-describedby="category-tags-hint"
            autoComplete="off"
          />
        </div>
        <p id="category-tags-hint" className={cn(FIELD_HINT_CLASS, "mt-1.5")}>
          {t("editor.tagsFormatHint")}
        </p>

        {tagOpen && !atLimit ? (
          <div
            id="category-tags-menu"
            role="listbox"
            className="absolute top-full z-40 mt-1.5 w-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)] ring-1 ring-charcoal/5"
          >
            <div className="border-b border-charcoal/8 px-3 py-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-charcoal/45 uppercase">
                {t("fields.tags")}
              </p>
            </div>
            <div className="max-h-60 overflow-y-auto overscroll-contain p-1.5">
              {tagLoading ? (
                <div
                  className="flex items-center justify-center gap-2 py-8 text-sm text-charcoal/55"
                  role="status"
                >
                  <Loader2
                    className="size-4 animate-spin text-brand"
                    aria-hidden
                  />
                  <span>{t("loadingCategory")}</span>
                </div>
              ) : (
                <>
                  {visibleSuggestions.map((suggestion) => {
                    const inUse = (suggestion.usageCount ?? 0) > 0;
                    return (
                      <div
                        key={suggestion.id}
                        className="group flex items-center gap-0.5 rounded-xl transition-colors hover:bg-[var(--workspace-surface)]"
                      >
                        <button
                          type="button"
                          role="option"
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left"
                          onClick={() =>
                            addTag({
                              nameId: suggestion.nameId,
                              nameEn: suggestion.nameEn,
                              slug: suggestion.slug,
                            })
                          }
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/8 text-brand">
                            <Tag className="size-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {tagDisplayName(suggestion, locale)}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-charcoal/50">
                              ID: {suggestion.nameId}
                              {suggestion.nameEn
                                ? ` · EN: ${suggestion.nameEn}`
                                : ""}
                              {" · "}
                              {inUse
                                ? t("editor.tagInUse", {
                                    count: suggestion.usageCount ?? 0,
                                  })
                                : t("editor.tagUnused")}
                            </span>
                          </span>
                        </button>
                        {!inUse ? (
                          <button
                            type="button"
                            className="mr-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-charcoal/35 opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
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
                      role="option"
                      className="mt-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-brand/30 bg-brand/[0.03] px-2.5 py-2.5 text-left transition hover:bg-brand/5"
                      onClick={() =>
                        addTag(createTagFromQuery(tagQuery, locale))
                      }
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                        <Plus className="size-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-brand">
                          {t("editor.createTag", { name: tagQuery.trim() })}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-charcoal/50">
                          {t("editor.tagsFormatHint")}
                        </span>
                      </span>
                    </button>
                  ) : null}

                  {showEmpty ? (
                    <p className="px-3 py-6 text-center text-sm text-charcoal/50">
                      {t("editor.tagsEmpty")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={Boolean(tagDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setTagDeleteTarget(null);
        }}
        title={t("confirm.deleteTagTitle")}
        description={t("confirm.deleteTagBody", {
          name: tagDeleteTarget
            ? tagDisplayName(tagDeleteTarget, locale)
            : "",
        })}
        confirmLabel={t("actions.deleteTag")}
        cancelLabel={t("actions.cancel")}
        pending={Boolean(deletingTagId)}
        tone="danger"
        onConfirm={() => void confirmDeleteCatalogTag()}
      />
    </div>
  );
}
