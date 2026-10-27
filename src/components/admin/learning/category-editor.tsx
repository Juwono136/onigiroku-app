"use client";

import { Archive, ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { RichTextField } from "@/components/admin/learning/rich-text-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { CATEGORY_DESCRIPTION_MAX, visibleLength } from "@/lib/learning/rich-text";
import type { LearningCategory, LearningStatus } from "@/lib/learning/types";
import type { MaterialListItem, MaterialListResult } from "@/lib/materials/types";
import { CMS_IMAGE_ACCEPT, CMS_IMAGE_MAX_BYTES } from "@/lib/materials/plain-text";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = { categoryId?: string };
type LocaleTab = "id" | "en";

type CategorySnapshot = {
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  status: LearningStatus;
  planKey: string;
  coverObjectKey: string | null;
};

function snapshotKey(s: CategorySnapshot): string {
  return JSON.stringify(s);
}

export function CategoryEditor({ categoryId }: Props) {
  const t = useTranslations("learningAdmin");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(Boolean(categoryId));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<LocaleTab>(locale === "en" ? "en" : "id");
  const [nameId, setNameId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionId, setDescriptionId] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [status, setStatus] = useState<LearningStatus>("DRAFT");
  const [planKey, setPlanKey] = useState("free");
  const [coverObjectKey, setCoverObjectKey] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [lessons, setLessons] = useState<MaterialListItem[]>([]);
  const [confirm, setConfirm] = useState<"archive" | "delete" | "save" | null>(null);
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(() =>
    categoryId
      ? null
      : snapshotKey({
          nameId: "",
          nameEn: "",
          descriptionId: "",
          descriptionEn: "",
          status: "DRAFT",
          planKey: "free",
          coverObjectKey: null,
        }),
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const allowLeaveRef = useRef(false);
  const snapshotRef = useRef<CategorySnapshot | null>(null);
  const cleanTokenRef = useRef(0);

  const currentSnapshot = useMemo(
    (): CategorySnapshot => ({
      nameId,
      nameEn,
      descriptionId,
      descriptionEn,
      status,
      planKey,
      coverObjectKey,
    }),
    [nameId, nameEn, descriptionId, descriptionEn, status, planKey, coverObjectKey],
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
    if (!categoryId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/admin/learning/categories/${categoryId}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await res.json()) as { data?: LearningCategory };
        if (!res.ok || !payload.data) throw new Error("load");
        const c = payload.data;
        const next: CategorySnapshot = {
          nameId: c.nameId,
          nameEn: c.nameEn,
          descriptionId: c.descriptionId,
          descriptionEn: c.descriptionEn,
          status: c.status,
          planKey: c.planKey || "free",
          coverObjectKey: c.coverObjectKey,
        };
        setNameId(next.nameId);
        setNameEn(next.nameEn);
        setDescriptionId(next.descriptionId);
        setDescriptionEn(next.descriptionEn);
        setStatus(next.status);
        setPlanKey(next.planKey);
        setCoverObjectKey(next.coverObjectKey);
        setCoverUrl(c.coverUrl);
        setSlug(c.slug);
        setBaseline(snapshotKey(next));
        window.setTimeout(() => {
          const snap = snapshotRef.current;
          if (snap) setBaseline(snapshotKey(snap));
        }, 150);
        const list = await fetch(
          `/api/admin/materials?page=1&pageSize=50&visibility=STUDENT&status=ALL&sortBy=position&sortDir=asc&categoryId=${encodeURIComponent(categoryId)}&locale=${locale === "en" ? "en" : "id"}`,
          { credentials: "same-origin", signal: controller.signal },
        );
        const listPayload = (await list.json()) as { data?: MaterialListResult };
        setLessons(listPayload.data?.items ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(t("errors.load"));
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [categoryId, locale, t]);

  async function uploadCover(file: File) {
    if (file.size > CMS_IMAGE_MAX_BYTES) {
      toast.error(t("errors.cover"));
      return;
    }
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/admin/materials/cover", { method: "POST", body, credentials: "same-origin" });
    const payload = (await res.json()) as { data?: { objectKey: string; publicUrl: string } };
    if (!res.ok || !payload.data) {
      toast.error(t("errors.cover"));
      return;
    }
    setCoverObjectKey(payload.data.objectKey);
    setCoverUrl(payload.data.publicUrl);
  }

  function validate() {
    const missingName = !nameId.trim() && !nameEn.trim();
    const longDescription = visibleLength(descriptionId) > CATEGORY_DESCRIPTION_MAX || visibleLength(descriptionEn) > CATEGORY_DESCRIPTION_MAX;
    setNameError(missingName);
    if (missingName) {
      toast.error(t("errors.name"));
      return false;
    }
    if (longDescription) {
      toast.error(t("errors.description"));
      return false;
    }
    return true;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const name = nameId.trim() || nameEn.trim();
      const payloadBody = {
        nameId: nameId.trim() || name,
        nameEn: nameEn.trim() || name,
        descriptionId,
        descriptionEn,
        status,
        planKey: planKey || "free",
        coverObjectKey,
      };
      const res = await fetch(
        categoryId ? `/api/admin/learning/categories/${categoryId}` : "/api/admin/learning/categories",
        {
          method: categoryId ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadBody),
        },
      );
      const payload = (await res.json()) as { data?: LearningCategory; error?: { message?: string } };
      if (!res.ok || !payload.data) {
        toast.error(payload.error?.message ?? t("errors.save"));
        return;
      }
      toast.success(t("toast.saved"));
      setNameId(payload.data.nameId);
      setNameEn(payload.data.nameEn);
      setDescriptionId(payload.data.descriptionId);
      setDescriptionEn(payload.data.descriptionEn);
      setStatus(payload.data.status);
      setPlanKey(payload.data.planKey || "free");
      setCoverObjectKey(payload.data.coverObjectKey);
      setCoverUrl(payload.data.coverUrl);
      setSlug(payload.data.slug);
      markEditorClean();
      if (!categoryId) {
        allowLeaveRef.current = true;
        router.replace(`/admin/learning/${payload.data.id}`);
      }
    } finally {
      setSaving(false);
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

  async function moveLesson(index: number, dir: -1 | 1) {
    if (!categoryId) return;
    const next = index + dir;
    if (next < 0 || next >= lessons.length) return;
    const copy = lessons.slice();
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    setLessons(copy);
    const res = await fetch(`/api/admin/learning/categories/${categoryId}/lessons/order`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: copy.map((l) => l.id) }),
    });
    if (!res.ok) toast.error(t("errors.save"));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-brand" /></div>;
  }

  const cover = toBrowserMediaUrl(coverUrl ?? coverObjectKey);
  const activeName = tab === "id" ? nameId : nameEn;
  const activeDescription = tab === "id" ? descriptionId : descriptionEn;

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
      <section className="min-w-0 space-y-5 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-3 shadow-sm sm:p-6">
        <div>
          <Link href="/admin/learning" className={cn(buttonVariants({ variant: "outline" }), "h-10 w-fit cursor-pointer gap-2 rounded-xl px-3 font-semibold shadow-sm")}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("actions.back")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-ink">{categoryId ? t("editTitle") : t("createTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-charcoal/65">{t("subtitle")}</p>
        </div>

        <div className="inline-flex rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)] p-1" role="tablist">
          {(["id", "en"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={cn(
                "h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold",
                tab === key ? "bg-[var(--workspace-card)] text-ink shadow-sm" : "text-charcoal/60",
              )}
              onClick={() => setTab(key)}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-name">
            {tab === "id" ? t("fields.nameId") : t("fields.nameEn")}
            <span className="ml-1 text-destructive" aria-hidden>*</span>
          </Label>
          <Input
            id="cat-name"
            value={activeName}
            maxLength={120}
            placeholder={tab === "id" ? t("placeholders.nameId") : t("placeholders.nameEn")}
            aria-invalid={nameError}
            onChange={(e) => {
              setNameError(false);
              if (tab === "id") setNameId(e.target.value);
              else setNameEn(e.target.value);
            }}
            className="h-12 rounded-2xl"
          />
          <p className={cn("text-[11px] font-semibold", nameError ? "text-destructive" : "text-charcoal/45")}>
            {activeName.trim().length}/120
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>{tab === "id" ? t("fields.descriptionId") : t("fields.descriptionEn")}</Label>
          <RichTextField
            key={tab}
            value={activeDescription}
            max={CATEGORY_DESCRIPTION_MAX}
            placeholder={t("placeholders.description")}
            counterLabel={`${visibleLength(activeDescription)}/${CATEGORY_DESCRIPTION_MAX}`}
            onChange={(stored) => {
              if (tab === "id") setDescriptionId(stored);
              else setDescriptionEn(stored);
            }}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 p-4 sm:flex-row sm:items-center">
          <div className="flex aspect-[2/1] max-h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-[var(--workspace-surface)] sm:aspect-video sm:max-h-none sm:w-52 sm:shrink-0">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="size-full object-cover" />
            ) : (
              <BrandLogo size={72} alt="" />
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <Label>{t("fields.cover")}</Label>
            <label className={cn(buttonVariants({ variant: "outline" }), "h-11 w-fit cursor-pointer rounded-2xl")}>
              {t("actions.uploadCover")}
              <input type="file" accept={CMS_IMAGE_ACCEPT} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadCover(file); }} />
            </label>
            <p className="text-[11px] leading-relaxed text-charcoal/50">{t("fields.coverOptional")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("fields.status")}</Label>
            <FilterSelect
              value={status}
              onValueChange={(next) => setStatus(next as LearningStatus)}
              options={[
                { value: "DRAFT", label: t("status.DRAFT") },
                { value: "PUBLISHED", label: t("status.PUBLISHED") },
                { value: "ARCHIVED", label: t("status.ARCHIVED") },
              ]}
              ariaLabel={t("fields.status")}
              triggerClassName="h-12 rounded-2xl"
            />
          </div>
          <div className="rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)] px-4 py-3">
            <p className="text-sm font-semibold text-ink">{t("fields.accessTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-charcoal/60">{t("fields.accessNote")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-charcoal/55 uppercase">{t("fields.slug")}</p>
          <p className="mt-1 break-all font-mono text-sm text-ink">{slug ? `/${slug}` : t("fields.slugPending")}</p>
          <p className="mt-1 text-xs leading-relaxed text-charcoal/55">{t("fields.slugNote")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={saving} onClick={() => { if (validate()) setConfirm("save"); }} className="h-11 cursor-pointer rounded-2xl px-5 font-semibold">
            {saving ? <Loader2 className="size-4 animate-spin" /> : t("actions.save")}
          </Button>
          {categoryId ? (
            <>
              <IconTooltip label={t("actions.archive")}>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-11 cursor-pointer rounded-2xl"
                  aria-label={t("actions.archive")}
                  onClick={() => setConfirm("archive")}
                >
                  <Archive className="size-4" />
                </Button>
              </IconTooltip>
              <IconTooltip label={t("actions.delete")}>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-11 cursor-pointer rounded-2xl text-destructive"
                  aria-label={t("actions.delete")}
                  onClick={() => setConfirm("delete")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </IconTooltip>
            </>
          ) : null}
        </div>
      </section>

      <aside className="min-w-0 space-y-3 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-3 shadow-sm sm:p-5 xl:sticky xl:top-24">
        {categoryId ? (
          <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">{t("lessons.title")}</h2>
              <p className="text-xs leading-relaxed text-charcoal/55">{t("lessons.orderHint")}</p>
            </div>
            <Link href={`/admin/learning/${categoryId}/lessons/new`} className={cn(buttonVariants(), "h-11 w-full cursor-pointer gap-2 rounded-xl px-3 font-semibold sm:h-10 sm:w-auto")}>
              <Plus className="size-4" />
              {t("lessons.new")}
            </Link>
          </div>
          {lessons.length === 0 ? <p className="text-sm text-charcoal/55">{t("lessons.empty")}</p> : null}
          <ol className="max-h-[min(70vh,36rem)] space-y-2 overflow-y-auto pr-1">
            {lessons.map((lesson, index) => (
              <li key={lesson.id} className="flex items-center gap-2.5 rounded-2xl border border-charcoal/10 bg-[var(--workspace-surface)] px-2.5 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/learning/${categoryId}/lessons/${lesson.id}`} className="block truncate font-semibold text-ink hover:text-brand">
                    {lesson.title || t("lessons.untitled")}
                  </Link>
                  <span className="mt-0.5 inline-flex rounded-full bg-[var(--workspace-card)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/60 uppercase">{lesson.status}</span>
                </div>
                <div className="flex shrink-0 items-center rounded-xl border border-charcoal/10 bg-[var(--workspace-card)] p-0.5">
                    <IconTooltip label={t("lessons.up")}>
                      <Button type="button" size="icon" variant="ghost" className="size-8 cursor-pointer" disabled={index === 0} onClick={() => void moveLesson(index, -1)} aria-label={t("lessons.up")}><ArrowUp className="size-4" /></Button>
                    </IconTooltip>
                    <IconTooltip label={t("lessons.down")}>
                      <Button type="button" size="icon" variant="ghost" className="size-8 cursor-pointer" disabled={index === lessons.length - 1} onClick={() => void moveLesson(index, 1)} aria-label={t("lessons.down")}><ArrowDown className="size-4" /></Button>
                    </IconTooltip>
                </div>
              </li>
            ))}
          </ol>
          </>
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink">{t("lessons.title")}</h2>
            <p className="text-sm leading-relaxed text-charcoal/60">{t("lessons.afterSave")}</p>
          </div>
        )}
      </aside>
      </div>

      <AdminConfirmDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          if (!open) pendingHrefRef.current = null;
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
        open={confirm !== null}
        onOpenChange={(open) => { if (!pending && !open) setConfirm(null); }}
        title={
          confirm === "delete"
            ? t("confirm.deleteTitle")
            : confirm === "archive"
              ? t("confirm.archiveTitle")
              : t("confirm.saveTitle")
        }
        description={
          confirm === "delete"
            ? t("confirm.deleteBody")
            : confirm === "archive"
              ? t("confirm.archiveBody")
              : t("confirm.saveBody")
        }
        confirmLabel={
          confirm === "delete"
            ? t("actions.delete")
            : confirm === "archive"
              ? t("actions.archive")
              : t("actions.save")
        }
        cancelLabel={t("actions.cancel")}
        pending={pending}
        tone={confirm === "delete" ? "danger" : "brand"}
        onConfirm={() => {
          if (confirm === "save") {
            setConfirm(null);
            void save();
            return;
          }
          if (!categoryId || !confirm) return;
          setPending(true);
          const url = confirm === "delete"
            ? `/api/admin/learning/categories/${categoryId}/hard-delete`
            : `/api/admin/learning/categories/${categoryId}`;
          void fetch(url, { method: confirm === "delete" ? "POST" : "DELETE", credentials: "same-origin" })
            .then(async (res) => {
              if (!res.ok) {
                const payload = (await res.json()) as { error?: { message?: string } };
                toast.error(payload.error?.message ?? t("errors.save"));
                return;
              }
              allowLeaveRef.current = true;
              router.replace("/admin/learning");
            })
            .finally(() => { setPending(false); setConfirm(null); });
        }}
      />
    </div>
  );
}
