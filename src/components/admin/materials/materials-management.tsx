"use client";

import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import type {
  MaterialListItem,
  MaterialListResult,
  MaterialStatus,
  MaterialVisibility,
} from "@/lib/materials/types";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type SortBy = "publishedAt" | "createdAt" | "updatedAt" | "title";
type ConfirmKind = "softDelete" | "hardDelete" | null;
type ViewMode = "rows" | "grid";

const VIEW_MODE_KEY = "admin.materials.viewMode";
const VIEW_MODE_EVENT = "admin-materials-view-mode";

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function readStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "rows";
  try {
    const raw = window.localStorage.getItem(VIEW_MODE_KEY);
    return raw === "grid" ? "grid" : "rows";
  } catch {
    return "rows";
  }
}

function subscribeViewMode(onStoreChange: () => void) {
  window.addEventListener(VIEW_MODE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(VIEW_MODE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function writeViewMode(next: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, next);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(VIEW_MODE_EVENT));
}

export function MaterialsManagement({ surface = "materials" }: { surface?: "materials" | "news" } = {}) {
  const t = useTranslations("adminMaterials");
  const locale = useLocale();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<MaterialVisibility | "ALL">(
    "ALL",
  );
  const [status, setStatus] = useState<MaterialStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const viewMode = useSyncExternalStore(
    subscribeViewMode,
    readStoredViewMode,
    () => "rows" as ViewMode,
  );
  const setViewMode = (next: ViewMode) => writeViewMode(next);

  const [data, setData] = useState<MaterialListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [target, setTarget] = useState<MaterialListItem | null>(null);
  const [pending, setPending] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const fetchList = useCallback(
    async (signal?: AbortSignal, requestId?: number) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        visibility: surface === "news" ? "PUBLIC" : visibility,
        status,
        sortBy,
        sortDir,
        locale: locale === "en" ? "en" : "id",
      });
      const res = await fetch(`/api/admin/materials?${params.toString()}`, {
        credentials: "same-origin",
        signal,
      });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: MaterialListResult;
        error?: { code?: string };
      };
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.code ?? "LIST_FAILED");
      }
      if (requestId !== undefined && requestId !== requestIdRef.current) return;
      setData(payload.data);
    },
    [locale, page, pageSize, search, sortBy, sortDir, status, visibility, surface],
  );

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    void (async () => {
      setLoading(true);
      try {
        await fetchList(controller.signal, requestId);
      } catch {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        toast.error(t("errors.loadList"));
        setData(null);
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [fetchList, t]);

  async function runConfirm() {
    if (!target || !confirm) return;
    setPending(true);
    try {
      const res =
        confirm === "softDelete"
          ? await fetch(
              `/api/admin/materials/${encodeURIComponent(target.id)}`,
              { method: "DELETE", credentials: "same-origin" },
            )
          : await fetch(
              `/api/admin/materials/${encodeURIComponent(target.id)}/hard-delete`,
              { method: "POST", credentials: "same-origin" },
            );
      const payload = (await res.json()) as {
        success?: boolean;
        error?: { code?: string };
      };
      if (!res.ok || !payload.success) {
        throw new Error(payload.error?.code ?? "ACTION_FAILED");
      }
      toast.success(
        confirm === "softDelete"
          ? t("toast.softDeleted")
          : t("toast.hardDeleted"),
      );
      const wasSoftDelete = confirm === "softDelete";
      setConfirm(null);
      setTarget(null);
      if (wasSoftDelete) {
        // Surface archived items immediately under Status → Archived.
        setStatus("ARCHIVED");
        setPage(1);
      } else {
        setLoading(true);
        try {
          await fetchList();
        } catch {
          toast.error(t("errors.loadList"));
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "ACTION_FAILED";
      toast.error(t(`errors.${code}` as "errors.ACTION_FAILED"));
    } finally {
      setPending(false);
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-seigaiha opacity-[0.18]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <header className="mb-5 space-y-3 sm:mb-7">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {surface === "news" ? t("newsTitle") : t("title")}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
                {surface === "news" ? t("newsSubtitle") : t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-charcoal/10 bg-white/85 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur">
                <BookOpen className="size-3.5 text-brand" aria-hidden />
                {t("totalLabel", { count: total })}
              </div>
              <Link
                href={surface === "news" ? "/admin/news/new" : "/admin/materials/new"}
                className={cn(
                  buttonVariants(),
                  "h-11 cursor-pointer gap-2 rounded-2xl px-4 font-semibold shadow-sm",
                )}
              >
                <Plus className="size-4" aria-hidden />
                {surface === "news" ? t("actions.newArticle") : t("actions.new")}
              </Link>
            </div>
          </div>
        </header>

        <div className="overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-elevated)] shadow-[0_22px_48px_-30px_rgba(15,23,42,0.4)]">
          <div className="flex flex-col gap-3 border-b border-charcoal/10 bg-gradient-to-b from-white/55 to-transparent p-4 sm:p-5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-charcoal/40"
                  aria-hidden
                />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-11 rounded-2xl border-charcoal/12 bg-white pl-10 pr-10 text-sm text-ink shadow-sm placeholder:text-charcoal/38"
                  aria-label={t("searchPlaceholder")}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-charcoal/45 hover:bg-soft hover:text-ink"
                    aria-label={t("actions.clearSearch")}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 cursor-pointer rounded-2xl font-semibold lg:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                {filtersOpen
                  ? t("actions.hideFilters")
                  : t("actions.showFilters")}
              </Button>

              <div
                className={cn(
                  "grid gap-2 sm:grid-cols-3 lg:flex lg:items-center",
                  filtersOpen ? "grid" : "hidden lg:flex",
                )}
              >
                {surface === "news" ? null : (
                <FilterSelect
                  ariaLabel={t("fields.visibility")}
                  value={visibility}
                  onValueChange={(next) => {
                    setVisibility(next as MaterialVisibility | "ALL");
                    setPage(1);
                  }}
                  className="lg:w-40"
                  options={[
                    { value: "ALL", label: t("filters.allVisibility") },
                    { value: "STUDENT", label: t("visibility.STUDENT") },
                    { value: "PUBLIC", label: t("visibility.PUBLIC") },
                  ]}
                />
                )}
                <FilterSelect
                  ariaLabel={t("fields.status")}
                  value={status}
                  onValueChange={(next) => {
                    setStatus(next as MaterialStatus | "ALL");
                    setPage(1);
                  }}
                  className="lg:w-40"
                  options={[
                    { value: "ALL", label: t("filters.allStatus") },
                    { value: "DRAFT", label: t("status.DRAFT") },
                    { value: "PUBLISHED", label: t("status.PUBLISHED") },
                    { value: "ARCHIVED", label: t("status.ARCHIVED") },
                  ]}
                />
                <FilterSelect
                  ariaLabel={t("filters.sort")}
                  value={`${sortBy}:${sortDir}`}
                  onValueChange={(next) => {
                    const [nextSort, nextDir] = next.split(":") as [
                      SortBy,
                      "asc" | "desc",
                    ];
                    setSortBy(nextSort);
                    setSortDir(nextDir);
                    setPage(1);
                  }}
                  className="lg:w-48"
                  options={[
                    { value: "updatedAt:desc", label: t("sort.updatedDesc") },
                    {
                      value: "publishedAt:desc",
                      label: t("sort.publishedDesc"),
                    },
                    { value: "createdAt:desc", label: t("sort.newest") },
                    { value: "createdAt:asc", label: t("sort.oldest") },
                    { value: "title:asc", label: t("sort.titleAsc") },
                    { value: "title:desc", label: t("sort.titleDesc") },
                  ]}
                />
                <div
                  className="inline-flex h-11 items-center rounded-2xl border border-charcoal/12 bg-white p-1 shadow-sm"
                  role="group"
                  aria-label={t("actions.viewMode")}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("actions.viewRows")}
                    aria-pressed={viewMode === "rows"}
                    title={t("actions.viewRows")}
                    onClick={() => setViewMode("rows")}
                    className={cn(
                      "size-9 cursor-pointer rounded-xl",
                      viewMode === "rows" &&
                        "bg-ink text-white hover:bg-ink hover:text-white",
                    )}
                  >
                    <List className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("actions.viewGrid")}
                    aria-pressed={viewMode === "grid"}
                    title={t("actions.viewGrid")}
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "size-9 cursor-pointer rounded-xl",
                      viewMode === "grid" &&
                        "bg-ink text-white hover:bg-ink hover:text-white",
                    )}
                  >
                    <LayoutGrid className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {viewMode === "rows" ? (
            <>
              <div className="hidden sm:block">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2
                      className="size-6 animate-spin text-brand"
                      aria-hidden
                    />
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState
                    title={
                      status === "ARCHIVED"
                        ? t("empty.archived")
                        : t("empty.list")
                    }
                  />
                ) : (
                  <ul className="divide-y divide-charcoal/8">
                    {items.map((item) => (
                      <MaterialRow
                        key={item.id}
                        item={item}
                        locale={locale}
                        editHref={surface === "news" ? `/admin/news/${item.id}` : `/admin/materials/${item.id}`}
                        onSoftDelete={() => {
                          setTarget(item);
                          setConfirm("softDelete");
                        }}
                        onHardDelete={() => {
                          setTarget(item);
                          setConfirm("hardDelete");
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid gap-3 p-4 sm:hidden sm:grid-cols-2">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center py-16">
                    <Loader2
                      className="size-6 animate-spin text-brand"
                      aria-hidden
                    />
                  </div>
                ) : items.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      title={
                        status === "ARCHIVED"
                          ? t("empty.archived")
                          : t("empty.list")
                      }
                    />
                  </div>
                ) : (
                  items.map((item) => (
                    <MaterialCard
                      key={item.id}
                      item={item}
                      locale={locale}
                      editHref={surface === "news" ? `/admin/news/${item.id}` : `/admin/materials/${item.id}`}
                      onSoftDelete={() => {
                        setTarget(item);
                        setConfirm("softDelete");
                      }}
                      onHardDelete={() => {
                        setTarget(item);
                        setConfirm("hardDelete");
                      }}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="col-span-full flex items-center justify-center py-16">
                  <Loader2
                    className="size-6 animate-spin text-brand"
                    aria-hidden
                  />
                </div>
              ) : items.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    title={
                      status === "ARCHIVED"
                        ? t("empty.archived")
                        : t("empty.list")
                    }
                  />
                </div>
              ) : (
                items.map((item) => (
                  <MaterialCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    editHref={surface === "news" ? `/admin/news/${item.id}` : `/admin/materials/${item.id}`}
                    onSoftDelete={() => {
                      setTarget(item);
                      setConfirm("softDelete");
                    }}
                    onHardDelete={() => {
                      setTarget(item);
                      setConfirm("hardDelete");
                    }}
                  />
                ))
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-charcoal/10 bg-white/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2 text-sm text-charcoal/65">
              <Filter className="size-3.5 shrink-0" aria-hidden />
              <span>
                {t("pagination.showing", {
                  from: total === 0 ? 0 : (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, total),
                  total,
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                ariaLabel={t("pagination.pageSize")}
                value={String(pageSize)}
                onValueChange={(next) => {
                  setPageSize(Number(next));
                  setPage(1);
                }}
                className="w-[7.5rem]"
                triggerClassName="h-9 rounded-xl text-sm"
                options={[10, 20, 50].map((size) => ({
                  value: String(size),
                  label: t("pagination.perPage", { count: size }),
                }))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loading || page <= 1}
                className="size-9 cursor-pointer rounded-xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t("pagination.prev")}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <span className="min-w-16 text-center text-sm font-semibold text-ink">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loading || page >= totalPages}
                className="size-9 cursor-pointer rounded-xl"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t("pagination.next")}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AdminConfirmDialog
        open={confirm === "softDelete"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
            setTarget(null);
          }
        }}
        title={t("confirm.softDeleteTitle")}
        description={t("confirm.softDeleteBody", {
          title: target?.title || t("untitled"),
        })}
        confirmLabel={t("confirm.softDeleteConfirm")}
        cancelLabel={t("actions.cancel")}
        pendingLabel={t("actions.deleting")}
        pending={pending}
        tone="brand"
        onConfirm={() => void runConfirm()}
      />
      <AdminConfirmDialog
        open={confirm === "hardDelete"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
            setTarget(null);
          }
        }}
        title={t("confirm.hardDeleteTitle")}
        description={t("confirm.hardDeleteBody", {
          title: target?.title || t("untitled"),
        })}
        confirmLabel={t("confirm.hardDeleteConfirm")}
        cancelLabel={t("actions.cancel")}
        pendingLabel={t("actions.deleting")}
        pending={pending}
        tone="danger"
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const t = useTranslations("adminMaterials");
  const isPublic = visibility === "PUBLIC";
  return (
    <Badge
      className={cn(
        "rounded-full border text-[11px] font-semibold shadow-none",
        isPublic
          ? "border-brand/25 bg-brand/10 text-brand"
          : "border-[color-mix(in_oklab,var(--info)_30%,white)] bg-[color-mix(in_oklab,var(--info)_10%,white)] text-[var(--info)]",
      )}
    >
      {t(`visibility.${visibility as "STUDENT" | "PUBLIC"}`)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("adminMaterials");
  const key = status as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  return (
    <Badge
      className={cn(
        "rounded-full border text-[11px] font-semibold shadow-none",
        key === "PUBLISHED" &&
          "border-[color-mix(in_oklab,var(--success)_30%,white)] bg-[color-mix(in_oklab,var(--success)_10%,white)] text-[var(--success)]",
        key === "DRAFT" &&
          "border-charcoal/15 bg-charcoal/5 text-charcoal/70",
        key === "ARCHIVED" &&
          "border-[color-mix(in_oklab,var(--warning)_30%,white)] bg-[color-mix(in_oklab,var(--warning)_10%,white)] text-[var(--warning)]",
      )}
    >
      {t(`status.${key}`)}
    </Badge>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-charcoal/10 bg-white text-charcoal/35 shadow-sm">
        <BookOpen className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
    </div>
  );
}

function MaterialRow({
  item,
  locale,
  editHref,
  onSoftDelete,
  onHardDelete,
}: {
  item: MaterialListItem;
  locale: string;
  editHref: string;
  onSoftDelete: () => void;
  onHardDelete: () => void;
}) {
  const t = useTranslations("adminMaterials");
  const coverSrc = toBrowserMediaUrl(item.coverUrl ?? item.coverObjectKey);

  return (
    <li className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/70">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-charcoal/10 bg-soft">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-charcoal/30">
            <BookOpen className="size-5" aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-bold text-ink">
            {item.title || t("untitled")}
          </p>
          {item.featured ? (
            <Star
              className="size-3.5 fill-[var(--warning)] text-[var(--warning)]"
              aria-label={t("fields.featured")}
            />
          ) : null}
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-charcoal/45">
          /{item.slug}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <VisibilityBadge visibility={item.visibility} />
          <StatusBadge status={item.status} />
          <span className="text-xs text-charcoal/50">
            {formatDate(item.updatedAt, locale)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href={editHref}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 cursor-pointer rounded-xl border border-transparent bg-white/70 px-3 font-semibold text-ink shadow-sm hover:border-charcoal/10 hover:bg-white",
          )}
        >
          <Pencil className="size-3.5 opacity-70" aria-hidden />
          {t("actions.edit")}
        </Link>
        {item.status !== "ARCHIVED" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 cursor-pointer rounded-xl text-charcoal/65 hover:text-ink"
            aria-label={t("actions.softDelete")}
            title={t("actions.softDelete")}
            onClick={onSoftDelete}
          >
            <Archive className="size-3.5" aria-hidden />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 cursor-pointer rounded-xl text-destructive/80 hover:text-destructive"
          aria-label={t("actions.hardDelete")}
          title={t("actions.hardDelete")}
          onClick={onHardDelete}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

function MaterialCard({
  item,
  locale,
  editHref,
  onSoftDelete,
  onHardDelete,
}: {
  item: MaterialListItem;
  locale: string;
  editHref: string;
  onSoftDelete: () => void;
  onHardDelete: () => void;
}) {
  const t = useTranslations("adminMaterials");
  const coverSrc = toBrowserMediaUrl(item.coverUrl ?? item.coverObjectKey);

  return (
    <article className="overflow-hidden rounded-2xl border border-charcoal/10 border-l-[3px] border-l-brand bg-white shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)]">
      <div className="aspect-[16/9] bg-soft">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-charcoal/25">
            <BookOpen className="size-8" aria-hidden />
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 font-bold text-ink">
            {item.title || t("untitled")}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-charcoal/45">
            /{item.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <VisibilityBadge visibility={item.visibility} />
          <StatusBadge status={item.status} />
          {item.featured ? (
            <Badge className="rounded-full border border-[color-mix(in_oklab,var(--warning)_30%,white)] bg-[color-mix(in_oklab,var(--warning)_10%,white)] text-[11px] font-semibold text-[var(--warning)] shadow-none">
              {t("fields.featured")}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-charcoal/55">
          {t("columns.updated")}:{" "}
          <span className="font-medium text-charcoal/75">
            {formatDate(item.updatedAt, locale)}
          </span>
        </p>
        <div
          className={cn(
            "grid gap-2",
            item.status === "ARCHIVED" ? "grid-cols-2" : "grid-cols-3",
          )}
        >
          <Link
            href={editHref}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 cursor-pointer rounded-xl font-semibold",
            )}
          >
            <Pencil className="size-3.5 opacity-70" aria-hidden />
            {t("actions.edit")}
          </Link>
          {item.status !== "ARCHIVED" ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer rounded-xl font-semibold"
              onClick={onSoftDelete}
            >
              <Archive className="size-3.5 opacity-70" aria-hidden />
              {t("actions.softDelete")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 cursor-pointer rounded-xl font-semibold text-destructive"
            onClick={onHardDelete}
          >
            <Trash2 className="size-3.5 opacity-70" aria-hidden />
            {t("actions.delete")}
          </Button>
        </div>
      </div>
    </article>
  );
}
