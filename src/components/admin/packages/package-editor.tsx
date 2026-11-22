"use client";

import {
  Archive,
  ArrowLeft,
  ImageIcon,
  Loader2,
  Lock,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminCategoryEditorSkeleton } from "@/components/admin/admin-loading";
import { RichTextField } from "@/components/admin/learning/rich-text-field";
import { AccessDurationField } from "@/components/admin/packages/access-duration-field";
import {
  type BenefitDraft,
  BenefitsEditor,
  toBenefitDrafts,
} from "@/components/admin/packages/benefits-editor";
import {
  FIELD_CLASS,
  FORM_CARD,
  FormCard,
} from "@/components/admin/packages/package-form-ui";
import { PackagePricingField } from "@/components/admin/packages/package-pricing-field";
import { PackageStatusField } from "@/components/admin/packages/package-status-field";
import {
  PathEntitlementPicker,
  type PathOption,
} from "@/components/admin/packages/path-entitlement-picker";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { visibleLength } from "@/lib/learning/rich-text";
import type { CategoryListResult } from "@/lib/learning/types";
import { inspectCoverImage } from "@/lib/materials/cover-image";
import { CMS_IMAGE_ACCEPT } from "@/lib/materials/plain-text";
import {
  BENEFITS_MAX,
  BENEFIT_TEXT_MAX,
  PACKAGE_DESCRIPTION_MAX,
  PACKAGE_DESCRIPTION_STORED_MAX,
  normalizeBenefits,
} from "@/lib/packages/benefits";
import { parseDiscountPercent } from "@/lib/packages/format";
import type {
  ClassPackage,
  PackageEntitlement,
  PackageStatus,
  PackageUpsertInput,
} from "@/lib/packages/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = { packageId?: string };
type LocaleTab = "id" | "en";
type DurationMode = "lifetime" | "days";
type ConfirmKind = "archive" | "delete" | "save" | null;

const NAME_MAX = 120;
const MAX_DURATION_DAYS = 36500;
const MAX_PRICE = 100_000_000_000;

type FormState = {
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  benefits: BenefitDraft[];
  priceIdr: number;
  discountPercent: string;
  discountStartsAt: string;
  discountEndsAt: string;
  durationMode: DurationMode;
  durationDays: string;
  coverObjectKey: string | null;
  status: PackageStatus;
  allPaths: boolean;
  pathIds: string[];
  /** Entitlements this form cannot edit yet (quiz/exam/private class); preserved on save. */
  otherEntitlements: Array<{ featureType: string; targetId: string | null }>;
};

const EMPTY_FORM: FormState = {
  nameId: "",
  nameEn: "",
  descriptionId: "",
  descriptionEn: "",
  benefits: [],
  priceIdr: 0,
  discountPercent: "0",
  discountStartsAt: "",
  discountEndsAt: "",
  durationMode: "lifetime",
  durationDays: "30",
  coverObjectKey: null,
  status: "PUBLISHED",
  allPaths: false,
  pathIds: [],
  otherEntitlements: [],
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** ISO timestamp -> value for <input type="datetime-local"> (browser local time). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formFromPackage(pkg: ClassPackage): FormState {
  const entitlements = pkg.entitlements ?? [];
  const allPaths = entitlements.some(
    (e) => e.featureType === "learning_path" && !e.targetId,
  );
  const pathIds = entitlements
    .filter((e) => e.featureType === "learning_path" && e.targetId)
    .map((e) => e.targetId as string)
    .sort();
  const otherEntitlements = entitlements
    .filter((e) => e.featureType !== "learning_path")
    .map((e) => ({ featureType: e.featureType, targetId: e.targetId ?? null }));
  return {
    nameId: pkg.nameId ?? "",
    nameEn: pkg.nameEn ?? "",
    descriptionId: pkg.descriptionId ?? "",
    descriptionEn: pkg.descriptionEn ?? "",
    benefits: toBenefitDrafts(pkg.benefits),
    priceIdr: pkg.priceIdr ?? 0,
    discountPercent: String(parseDiscountPercent(pkg.discountPercent ?? 0)),
    discountStartsAt: isoToLocalInput(pkg.discountStartsAt),
    discountEndsAt: isoToLocalInput(pkg.discountEndsAt),
    durationMode: pkg.accessDurationDays ? "days" : "lifetime",
    durationDays: pkg.accessDurationDays ? String(pkg.accessDurationDays) : "30",
    coverObjectKey: pkg.coverObjectKey ?? null,
    status: pkg.status,
    allPaths,
    pathIds,
    otherEntitlements,
  };
}

function snapshotKey(form: FormState): string {
  return JSON.stringify({
    ...form,
    benefits: form.benefits.map(({ textId, textEn }) => ({ textId, textEn })),
    pathIds: [...form.pathIds].sort(),
  });
}


export function PackageEditor({ packageId }: Props) {
  const t = useTranslations("packagesAdmin");
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(Boolean(packageId));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<LocaleTab>(locale === "en" ? "en" : "id");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<string | null>(() =>
    packageId ? null : snapshotKey(EMPTY_FORM),
  );
  // Bumped when a saved package is (re)applied so rich-text editors remount with fresh content.
  const [editorKey, setEditorKey] = useState(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [removeCoverOpen, setRemoveCoverOpen] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pending, setPending] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);

  const [pathOptions, setPathOptions] = useState<PathOption[]>([]);
  const [pathsLoading, setPathsLoading] = useState(true);
  const [pathsError, setPathsError] = useState(false);
  const [savedEntitlements, setSavedEntitlements] = useState<PackageEntitlement[]>([]);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const allowLeaveRef = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const savedCoverKeyRef = useRef<string | null>(null);

  const dirty = baseline !== null && snapshotKey(form) !== baseline;

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function applyPackage(pkg: ClassPackage) {
    const next = formFromPackage(pkg);
    setForm(next);
    setEditorKey((k) => k + 1);
    setBaseline(snapshotKey(next));
    setCoverUrl(pkg.coverUrl ?? null);
    setSavedEntitlements(pkg.entitlements ?? []);
    savedCoverKeyRef.current = pkg.coverObjectKey ?? null;
  }

  // Leave guard: native reload/close.
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

  // Leave guard: in-app link clicks.
  useEffect(() => {
    if (!dirty) return;

    function onDocumentClick(event: MouseEvent) {
      if (allowLeaveRef.current) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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

  function confirmLeave() {
    const href = pendingHrefRef.current;
    setLeaveOpen(false);
    pendingHrefRef.current = null;
    if (!href) return;
    allowLeaveRef.current = true;
    window.location.assign(href);
  }

  // Load package.
  useEffect(() => {
    if (!packageId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/admin/packages/${packageId}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await res.json()) as { data?: ClassPackage };
        if (!res.ok || !payload.data) throw new Error("load");
        applyPackage(payload.data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(t("errors.load"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  // Load published learning paths for entitlements (paginate so large catalogs stay complete).
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const collected: PathOption[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await fetch(
            `/api/admin/learning/categories?page=${page}&pageSize=100&status=PUBLISHED&sortBy=name&sortDir=asc`,
            { credentials: "same-origin", signal: controller.signal },
          );
          const payload = (await res.json()) as { data?: CategoryListResult };
          if (!res.ok || !payload.data) throw new Error("load");
          totalPages = Math.max(1, payload.data.totalPages ?? 1);
          for (const c of payload.data.items) {
            collected.push({
              id: c.id,
              label:
                locale === "en"
                  ? c.nameEn || c.nameId
                  : c.nameId || c.nameEn,
            });
          }
          page += 1;
        } while (page <= totalPages && page <= 20);
        setPathOptions(collected);
        setPathsError(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPathsError(true);
      } finally {
        if (!controller.signal.aborted) setPathsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [locale]);

  // Merge selected paths that are no longer in the published list (e.g. archived).
  const allPathOptions = useMemo<PathOption[]>(() => {
    const known = new Set(pathOptions.map((p) => p.id));
    const extras: PathOption[] = [];
    for (const id of form.pathIds) {
      if (known.has(id)) continue;
      const saved = savedEntitlements.find(
        (e) => e.featureType === "learning_path" && e.targetId === id,
      );
      extras.push({ id, label: saved?.targetName || id, archived: true });
    }
    return [...extras, ...pathOptions];
  }, [pathOptions, form.pathIds, savedEntitlements]);

  async function uploadCover(file: File) {
    const inspected = await inspectCoverImage(file);
    if (!inspected.ok) {
      if (inspected.code === "COVER_TOO_SMALL") {
        toast.error(t("errors.coverTooSmall"));
      } else if (inspected.code === "COVER_DECODE_FAILED") {
        toast.error(t("errors.coverDecode"));
      } else {
        toast.error(t("errors.cover"));
      }
      return;
    }
    if (inspected.aspectWarning) toast.message(t("errors.coverAspect"));
    setUploadingCover(true);
    try {
      const body = new FormData();
      body.set("file", file);
      // Only purge an unsaved previous upload; a saved cover is removed on save by Go.
      if (form.coverObjectKey && form.coverObjectKey !== savedCoverKeyRef.current) {
        body.set("previousObjectKey", form.coverObjectKey);
      }
      const res = await fetch("/api/admin/materials/cover", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const payload = (await res.json()) as {
        data?: { objectKey: string; publicUrl: string };
      };
      if (!res.ok || !payload.data) {
        toast.error(t("errors.cover"));
        return;
      }
      patch({ coverObjectKey: payload.data.objectKey });
      setCoverUrl(payload.data.publicUrl);
      toast.success(t("toast.coverUploaded"));
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function confirmRemoveCover() {
    const key = form.coverObjectKey;
    setRemovingCover(true);
    try {
      if (key && key !== savedCoverKeyRef.current) {
        await fetch("/api/admin/materials/cover", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey: key }),
        });
      }
      patch({ coverObjectKey: null });
      setCoverUrl(null);
      setRemoveCoverOpen(false);
      toast.success(t("toast.coverRemoved"));
    } finally {
      setRemovingCover(false);
    }
  }

  function togglePath(id: string) {
    setForm((prev) => ({
      ...prev,
      pathIds: prev.pathIds.includes(id)
        ? prev.pathIds.filter((p) => p !== id)
        : [...prev.pathIds, id],
    }));
  }

  const discountPercent = parseDiscountPercent(form.discountPercent);

  function validate(): boolean {
    const missingName = !form.nameId.trim() && !form.nameEn.trim();
    setNameError(missingName);
    if (missingName) {
      toast.error(t("errors.name"));
      return false;
    }
    if (
      visibleLength(form.descriptionId) > PACKAGE_DESCRIPTION_MAX ||
      visibleLength(form.descriptionEn) > PACKAGE_DESCRIPTION_MAX ||
      form.descriptionId.length > PACKAGE_DESCRIPTION_STORED_MAX ||
      form.descriptionEn.length > PACKAGE_DESCRIPTION_STORED_MAX
    ) {
      toast.error(t("errors.description"));
      return false;
    }
    if (form.benefits.length > BENEFITS_MAX) {
      toast.error(t("errors.benefitsMax"));
      return false;
    }
    if (
      form.benefits.some(
        (b) =>
          Array.from(b.textId.trim()).length > BENEFIT_TEXT_MAX ||
          Array.from(b.textEn.trim()).length > BENEFIT_TEXT_MAX,
      )
    ) {
      toast.error(t("errors.benefitTooLong"));
      return false;
    }
    if (form.priceIdr < 0 || form.priceIdr > MAX_PRICE) {
      toast.error(t("errors.price"));
      return false;
    }
    if (discountPercent > 0) {
      const start = localInputToIso(form.discountStartsAt);
      const end = localInputToIso(form.discountEndsAt);
      if (!start || !end) {
        toast.error(t("errors.discountDates"));
        return false;
      }
      if (start > end) {
        toast.error(t("errors.discountRange"));
        return false;
      }
    }
    if (form.durationMode === "days") {
      const days = Number.parseInt(form.durationDays, 10);
      if (!Number.isFinite(days) || days < 1 || days > MAX_DURATION_DAYS) {
        toast.error(t("errors.duration", { max: MAX_DURATION_DAYS }));
        return false;
      }
    }
    return true;
  }

  function buildPayload(): PackageUpsertInput {
    const name = form.nameId.trim() || form.nameEn.trim();
    const descPrimary = form.descriptionId.trim() || form.descriptionEn.trim();
    const entitlements: PackageUpsertInput["entitlements"] = [];
    if (form.allPaths) {
      entitlements.push({ featureType: "learning_path", targetId: null });
    } else {
      for (const id of form.pathIds) {
        entitlements.push({ featureType: "learning_path", targetId: id });
      }
    }
    entitlements.push(...form.otherEntitlements);
    return {
      nameId: form.nameId.trim() || name,
      nameEn: form.nameEn.trim() || name,
      descriptionId: form.descriptionId.trim() || descPrimary,
      descriptionEn: form.descriptionEn.trim() || descPrimary,
      benefits: normalizeBenefits(form.benefits),
      priceIdr: form.priceIdr,
      discountPercent,
      discountStartsAt:
        discountPercent > 0 ? localInputToIso(form.discountStartsAt) : null,
      discountEndsAt:
        discountPercent > 0 ? localInputToIso(form.discountEndsAt) : null,
      accessDurationDays:
        form.durationMode === "days"
          ? Number.parseInt(form.durationDays, 10)
          : null,
      coverObjectKey: form.coverObjectKey,
      status: form.status,
      entitlements,
    };
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(
        packageId ? `/api/admin/packages/${packageId}` : "/api/admin/packages",
        {
          method: packageId ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        },
      );
      const payload = (await res.json()) as {
        data?: ClassPackage;
        error?: { message?: string };
      };
      if (!res.ok || !payload.data) {
        toast.error(payload.error?.message ?? t("errors.save"));
        return;
      }
      toast.success(t("toast.saved"));
      if (!packageId) {
        allowLeaveRef.current = true;
        router.replace(`/admin/packages/${payload.data.id}`);
        return;
      }
      applyPackage(payload.data);
    } catch {
      toast.error(t("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  async function runDangerAction(kind: "archive" | "delete") {
    if (!packageId) return;
    setPending(true);
    setDeleteBlocked(null);
    try {
      const res =
        kind === "delete"
          ? await fetch(`/api/admin/packages/${packageId}/hard-delete`, {
              method: "POST",
              credentials: "same-origin",
            })
          : await fetch(`/api/admin/packages/${packageId}`, {
              method: "DELETE",
              credentials: "same-origin",
            });
      if (!res.ok) {
        const payload = (await res
          .json()
          .catch(() => ({}))) as { error?: { message?: string } };
        if (kind === "delete" && res.status === 409) {
          const message = payload.error?.message ?? t("errors.deleteBlocked");
          setDeleteBlocked(message);
          toast.error(message);
        } else {
          toast.error(payload.error?.message ?? t("errors.save"));
        }
        return;
      }
      allowLeaveRef.current = true;
      router.replace("/admin/packages");
    } catch {
      toast.error(t("errors.save"));
    } finally {
      setPending(false);
      setConfirm(null);
    }
  }

  if (loading) {
    return <AdminCategoryEditorSkeleton label={t("loadingPackage")} />;
  }

  const cover = toBrowserMediaUrl(coverUrl ?? form.coverObjectKey);
  const activeName = tab === "id" ? form.nameId : form.nameEn;
  const activeDescription = tab === "id" ? form.descriptionId : form.descriptionEn;
  const comingSoon: Array<{ key: "quiz" | "exam" | "privateClass" }> = [
    { key: "quiz" },
    { key: "exam" },
    { key: "privateClass" },
  ];

  const choiceClass = (active: boolean) =>
    cn(
      "flex cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold text-ink transition",
      active
        ? "border-brand/50 bg-brand/[0.06] ring-1 ring-brand/20"
        : "border-charcoal/15 bg-white hover:border-charcoal/30",
    );

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-5 px-3 py-4 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <header className="space-y-2">
        <Link
          href="/admin/packages"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 w-fit cursor-pointer gap-2 rounded-xl border-charcoal/20 bg-white px-3 font-semibold shadow-xs",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("actions.back")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {packageId ? t("editTitle") : t("createTitle")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-charcoal/70">
          {t("editorSubtitle")}
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <div className="min-w-0 space-y-5">
          <FormCard
            title={t("sections.basics")}
            hint={t("sections.basicsHint")}
            action={
              <div
                className="inline-flex rounded-xl border border-charcoal/15 bg-[var(--workspace-surface)] p-1"
                role="tablist"
              >
                {(["id", "en"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={cn(
                      "h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold transition",
                      tab === key
                        ? "bg-white text-brand shadow-sm ring-1 ring-charcoal/10"
                        : "text-charcoal/65 hover:text-ink",
                    )}
                    onClick={() => setTab(key)}
                  >
                    {t(`tabs.${key}`)}
                  </button>
                ))}
              </div>
            }
          >
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name">
                {tab === "id" ? t("fields.nameId") : t("fields.nameEn")}
                <span className="ml-1 text-destructive" aria-hidden>
                  *
                </span>
              </Label>
              <Input
                id="pkg-name"
                value={activeName}
                maxLength={NAME_MAX}
                placeholder={
                  tab === "id" ? t("placeholders.nameId") : t("placeholders.nameEn")
                }
                aria-invalid={nameError}
                onChange={(e) => {
                  setNameError(false);
                  if (tab === "id") patch({ nameId: e.target.value });
                  else patch({ nameEn: e.target.value });
                }}
                className={cn(FIELD_CLASS, "h-12 rounded-xl text-base")}
              />
              <p
                className={cn(
                  "text-right text-[11px] font-semibold tabular-nums",
                  nameError ? "text-destructive" : "text-charcoal/55",
                )}
              >
                {activeName.trim().length}/{NAME_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                {tab === "id" ? t("fields.descriptionId") : t("fields.descriptionEn")}
              </Label>
              <p className="text-xs text-charcoal/60">{t("fields.descriptionHint")}</p>
              <RichTextField
                key={`${tab}-${editorKey}`}
                value={activeDescription}
                max={PACKAGE_DESCRIPTION_MAX}
                placeholder={t("placeholders.description")}
                counterLabel={`${visibleLength(activeDescription)}/${PACKAGE_DESCRIPTION_MAX}`}
                onChange={(stored) => {
                  if (tab === "id") patch({ descriptionId: stored });
                  else patch({ descriptionEn: stored });
                }}
              />
            </div>
          </FormCard>

          <FormCard title={t("benefits.title")} hint={t("benefits.hint")}>
            <BenefitsEditor
              value={form.benefits}
              onChange={(benefits) => patch({ benefits })}
              activeLocale={tab}
            />
          </FormCard>

          <FormCard title={t("sections.media")} hint={t("sections.mediaHint")}>
            <div className="flex flex-col gap-4 rounded-xl border border-charcoal/15 bg-[var(--workspace-surface)]/40 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex aspect-[2/1] max-h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-charcoal/10 bg-white sm:aspect-video sm:max-h-none sm:w-52 sm:shrink-0">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="size-full object-cover" />
                ) : (
                  <BrandLogo size={72} alt="" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label>{t("fields.cover")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingCover || removingCover}
                    className="h-11 w-full cursor-pointer gap-2 rounded-xl border-charcoal/20 bg-white font-semibold shadow-xs sm:w-auto"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {uploadingCover ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ImageIcon className="size-4" aria-hidden />
                    )}
                    {cover ? t("actions.replaceCover") : t("actions.uploadCover")}
                  </Button>
                  {cover ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingCover || removingCover}
                      className="h-11 w-full cursor-pointer gap-2 rounded-xl border-charcoal/20 bg-white font-semibold text-destructive shadow-xs sm:w-auto"
                      onClick={() => setRemoveCoverOpen(true)}
                    >
                      <X className="size-4" aria-hidden />
                      {t("actions.removeCover")}
                    </Button>
                  ) : null}
                </div>
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
                <p className="text-[11px] leading-relaxed text-charcoal/60">
                  {t("fields.coverOptional")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.status")}</Label>
              <PackageStatusField
                value={form.status}
                onChange={(status) => patch({ status })}
              />
            </div>

            {deleteBlocked ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
              >
                <p className="text-sm font-semibold text-destructive">
                  {t("danger.blockedTitle")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-destructive/90">
                  {deleteBlocked}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-charcoal/65">
                  {t("danger.blockedHint")}
                </p>
              </div>
            ) : null}
          </FormCard>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <FormCard title={t("pricing.title")} hint={t("pricing.hint")}>
            <PackagePricingField
              priceIdr={form.priceIdr}
              discountPercent={form.discountPercent}
              discountStartsAt={form.discountStartsAt}
              discountEndsAt={form.discountEndsAt}
              maxPrice={MAX_PRICE}
              onPriceChange={(priceIdr) => patch({ priceIdr })}
              onDiscountChange={(next) => patch({ discountPercent: next })}
              onScheduleChange={(next) => patch(next)}
            />
          </FormCard>

          <FormCard title={t("duration.title")} hint={t("duration.hint")}>
            <AccessDurationField
              mode={form.durationMode}
              days={form.durationDays}
              maxDays={MAX_DURATION_DAYS}
              onModeChange={(durationMode) => patch({ durationMode })}
              onDaysChange={(durationDays) => patch({ durationDays })}
            />
          </FormCard>

          <FormCard title={t("entitlements.title")} hint={t("entitlements.hint")}>
            <label
              className={cn(
                choiceClass(form.allPaths),
                "items-start gap-3",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--brand)]"
                checked={form.allPaths}
                onChange={(e) =>
                  patch({
                    allPaths: e.target.checked,
                    pathIds: e.target.checked ? [] : form.pathIds,
                  })
                }
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t("entitlements.allPaths")}
                </span>
                <span className="mt-0.5 block text-xs font-normal leading-relaxed text-charcoal/65">
                  {t("entitlements.allPathsHint")}
                </span>
              </span>
            </label>

            <PathEntitlementPicker
              options={allPathOptions}
              selectedIds={form.pathIds}
              allPaths={form.allPaths}
              loading={pathsLoading}
              error={pathsError}
              onToggle={togglePath}
              onClear={() => patch({ pathIds: [] })}
            />

            <div className="space-y-2">
              <p className="text-[11px] font-bold tracking-[0.14em] text-charcoal/55 uppercase">
                {t("entitlements.comingSoonSection")}
              </p>
              {comingSoon.map(({ key }) => (
                <div
                  key={key}
                  aria-disabled
                  className="flex items-start gap-3 rounded-xl border border-dashed border-charcoal/25 bg-[var(--workspace-surface)]/50 px-4 py-3 opacity-70"
                >
                  <Lock className="mt-0.5 size-4 shrink-0 text-charcoal/55" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {t(`entitlements.${key}`)}
                    </p>
                    <p className="text-xs leading-relaxed text-charcoal/60">
                      {t(`entitlements.${key}Hint`)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-charcoal/20 bg-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-charcoal/60 uppercase">
                    {t("entitlements.comingSoon")}
                  </span>
                </div>
              ))}
            </div>
          </FormCard>
        </aside>
      </div>

      <div
        className={cn(
          FORM_CARD,
          "sticky bottom-3 z-30 flex flex-wrap items-center gap-2 bg-white/95 p-3 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] backdrop-blur sm:px-4",
        )}
      >
        <Button
          type="button"
          disabled={saving}
          onClick={() => {
            if (validate()) setConfirm("save");
          }}
          className="h-11 cursor-pointer rounded-xl px-6 font-semibold"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            t("actions.save")
          )}
        </Button>
        {packageId ? (
          <>
            {form.status !== "ARCHIVED" ? (
              <IconTooltip label={t("actions.archive")}>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-11 cursor-pointer rounded-xl border-charcoal/20 bg-white"
                  aria-label={t("actions.archive")}
                  onClick={() => setConfirm("archive")}
                >
                  <Archive className="size-4" />
                </Button>
              </IconTooltip>
            ) : null}
            <IconTooltip label={t("actions.delete")}>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11 cursor-pointer rounded-xl border-charcoal/20 bg-white text-destructive hover:bg-destructive/5"
                aria-label={t("actions.delete")}
                onClick={() => setConfirm("delete")}
              >
                <Trash2 className="size-4" />
              </Button>
            </IconTooltip>
          </>
        ) : null}
        {dirty ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/75">
            <span className="size-2 rounded-full bg-brand" aria-hidden />
            {t("unsaved")}
          </span>
        ) : null}
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
        open={removeCoverOpen}
        onOpenChange={(open) => {
          if (removingCover) return;
          setRemoveCoverOpen(open);
        }}
        title={t("confirm.removeCoverTitle")}
        description={t("confirm.removeCoverBody")}
        confirmLabel={t("actions.removeCover")}
        cancelLabel={t("actions.cancel")}
        pending={removingCover}
        tone="danger"
        onConfirm={() => {
          void confirmRemoveCover();
        }}
      />

      <AdminConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setConfirm(null);
        }}
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
          if (confirm === "archive" || confirm === "delete") {
            void runDangerAction(confirm);
          }
        }}
      />
    </div>
  );
}
