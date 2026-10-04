"use client";

import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { UserDetailDialog } from "@/components/admin/user-detail-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminUserListItem,
  ListUsersResult,
  UsersListScope,
  UserStatus,
} from "@/lib/admin/users";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type SortBy =
  | "name"
  | "email"
  | "role"
  | "status"
  | "createdAt"
  | "lastLoginAt";

type Props = {
  currentUserId: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

export function UsersManagement({ currentUserId }: Props) {
  const t = useTranslations("adminUsers");
  const locale = useLocale();

  const [scope, setScope] = useState<UsersListScope>("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [status, setStatus] = useState<UserStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [data, setData] = useState<ListUsersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const queryKey = `${page}|${pageSize}|${search}|${role}|${status}|${scope}|${sortBy}|${sortDir}`;

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    void (async () => {
      // Defer so setState is not synchronous inside the effect body.
      await Promise.resolve();
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search,
          role,
          status,
          scope,
          sortBy,
          sortDir,
        });
        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await res.json()) as {
          success?: boolean;
          data?: ListUsersResult;
          error?: { code?: string };
        };
        if (!res.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.code ?? "LIST_FAILED");
        }
        if (requestId !== requestIdRef.current) return;
        setData(payload.data);
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
  }, [queryKey, page, pageSize, search, role, status, scope, sortBy, sortDir, t]);

  const refresh = useCallback(() => {
    requestIdRef.current += 1;
    const next = requestIdRef.current;
    void (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search,
          role,
          status,
          scope,
          sortBy,
          sortDir,
        });
        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          credentials: "same-origin",
        });
        const payload = (await res.json()) as {
          success?: boolean;
          data?: ListUsersResult;
          error?: { code?: string };
        };
        if (!res.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.code ?? "LIST_FAILED");
        }
        if (next !== requestIdRef.current) return;
        setData(payload.data);
      } catch {
        if (next !== requestIdRef.current) return;
        toast.error(t("errors.loadList"));
      } finally {
        if (next === requestIdRef.current) setLoading(false);
      }
    })();
  }, [page, pageSize, search, role, status, scope, sortBy, sortDir, t]);

  function toggleSort(column: SortBy) {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "name" || column === "email" ? "asc" : "desc");
    }
    setPage(1);
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

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
        <header className="mb-6 space-y-2 sm:mb-8">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal/70">
                {t("subtitle")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-charcoal/10 bg-white/80 px-3 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur">
              <Users className="size-4 text-brand" aria-hidden />
              {t("totalLabel", { count: total })}
            </div>
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-[var(--workspace-elevated)] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-3 border-b border-charcoal/10 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setScope("active");
                  setPage(1);
                }}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                  scope === "active"
                    ? "bg-brand text-white"
                    : "bg-soft text-charcoal/70 hover:bg-charcoal/10 hover:text-ink",
                )}
              >
                <Users className="size-3.5" aria-hidden />
                {t("tabs.active")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("trash");
                  setPage(1);
                }}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                  scope === "trash"
                    ? "bg-brand text-white"
                    : "bg-soft text-charcoal/70 hover:bg-charcoal/10 hover:text-ink",
                )}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {t("tabs.trash")}
              </button>
            </div>

            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-charcoal/40"
                  aria-hidden
                />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-11 rounded-xl border-charcoal/15 bg-white pl-10 pr-10 text-sm"
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
                className="h-11 cursor-pointer rounded-xl font-semibold lg:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                {filtersOpen ? t("actions.hideFilters") : t("actions.showFilters")}
              </Button>

              <div
                className={cn(
                  "grid gap-2 sm:grid-cols-3 lg:flex lg:items-center",
                  filtersOpen ? "grid" : "hidden lg:flex",
                )}
              >
                <label className="min-w-0">
                  <span className="sr-only">{t("fields.role")}</span>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as UserRole | "ALL");
                      setPage(1);
                    }}
                    className="h-11 w-full cursor-pointer rounded-xl border border-charcoal/15 bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 lg:w-36"
                  >
                    <option value="ALL">{t("filters.allRoles")}</option>
                    <option value="USER">
                      {locale === "en"
                        ? ROLE_LABELS.USER.en
                        : ROLE_LABELS.USER.id}
                    </option>
                    <option value="ADMIN">
                      {locale === "en"
                        ? ROLE_LABELS.ADMIN.en
                        : ROLE_LABELS.ADMIN.id}
                    </option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="sr-only">{t("fields.status")}</span>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as UserStatus | "ALL");
                      setPage(1);
                    }}
                    className="h-11 w-full cursor-pointer rounded-xl border border-charcoal/15 bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 lg:w-36"
                  >
                    <option value="ALL">{t("filters.allStatus")}</option>
                    <option value="ACTIVE">{t("status.ACTIVE")}</option>
                    <option value="INACTIVE">{t("status.INACTIVE")}</option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="sr-only">{t("filters.sort")}</span>
                  <select
                    value={`${sortBy}:${sortDir}`}
                    onChange={(e) => {
                      const [nextSort, nextDir] = e.target.value.split(":") as [
                        SortBy,
                        "asc" | "desc",
                      ];
                      setSortBy(nextSort);
                      setSortDir(nextDir);
                      setPage(1);
                    }}
                    className="h-11 w-full cursor-pointer rounded-xl border border-charcoal/15 bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 lg:w-48"
                  >
                    <option value="createdAt:desc">{t("sort.newest")}</option>
                    <option value="createdAt:asc">{t("sort.oldest")}</option>
                    <option value="name:asc">{t("sort.nameAsc")}</option>
                    <option value="name:desc">{t("sort.nameDesc")}</option>
                    <option value="lastLoginAt:desc">
                      {t("sort.lastLogin")}
                    </option>
                    <option value="email:asc">{t("sort.emailAsc")}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-charcoal/10 bg-soft/50 text-[11px] font-semibold tracking-wide text-charcoal/50 uppercase">
                <tr>
                  <th className="px-5 py-3">
                    <SortButton
                      active={sortBy === "name"}
                      dir={sortDir}
                      onClick={() => toggleSort("name")}
                      label={t("columns.user")}
                    />
                  </th>
                  <th className="px-3 py-3">
                    <SortButton
                      active={sortBy === "role"}
                      dir={sortDir}
                      onClick={() => toggleSort("role")}
                      label={t("columns.role")}
                    />
                  </th>
                  <th className="px-3 py-3">
                    <SortButton
                      active={sortBy === "status"}
                      dir={sortDir}
                      onClick={() => toggleSort("status")}
                      label={t("columns.status")}
                    />
                  </th>
                  <th className="px-3 py-3">
                    <SortButton
                      active={sortBy === "lastLoginAt"}
                      dir={sortDir}
                      onClick={() => toggleSort("lastLoginAt")}
                      label={t("columns.lastLogin")}
                    />
                  </th>
                  <th className="px-5 py-3 text-right">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <Loader2
                        className="mx-auto size-6 animate-spin text-brand"
                        aria-hidden
                      />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-16 text-center text-charcoal/55"
                    >
                      {scope === "trash" ? t("empty.trash") : t("empty.active")}
                    </td>
                  </tr>
                ) : (
                  items.map((user) => (
                    <UserTableRow
                      key={user.id}
                      user={user}
                      locale={locale}
                      currentUserId={currentUserId}
                      onDetails={() => setDetailUserId(user.id)}
                      detailsLabel={t("actions.details")}
                      youLabel={t("detail.you")}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
              </div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-charcoal/55">
                {scope === "trash" ? t("empty.trash") : t("empty.active")}
              </p>
            ) : (
              items.map((user) => (
                <UserMobileCard
                  key={user.id}
                  user={user}
                  locale={locale}
                  currentUserId={currentUserId}
                  onDetails={() => setDetailUserId(user.id)}
                  detailsLabel={t("actions.details")}
                  youLabel={t("detail.you")}
                  lastLoginLabel={t("columns.lastLogin")}
                />
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-charcoal/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 cursor-pointer rounded-xl border border-charcoal/15 bg-white px-2.5 text-sm font-medium outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                aria-label={t("pagination.pageSize")}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {t("pagination.perPage", { count: size })}
                  </option>
                ))}
              </select>
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

      <UserDetailDialog
        open={Boolean(detailUserId)}
        userId={detailUserId}
        currentUserId={currentUserId}
        locale={locale}
        onOpenChange={(open) => {
          if (!open) setDetailUserId(null);
        }}
        onChanged={refresh}
      />
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-ink",
        active ? "text-ink" : "text-charcoal/50",
      )}
    >
      {label}
      <ArrowDownUp
        className={cn(
          "size-3",
          active && dir === "asc" && "rotate-180",
          !active && "opacity-40",
        )}
        aria-hidden
      />
    </button>
  );
}

function UserTableRow({
  user,
  locale,
  currentUserId,
  onDetails,
  detailsLabel,
  youLabel,
}: {
  user: AdminUserListItem;
  locale: string;
  currentUserId: string;
  onDetails: () => void;
  detailsLabel: string;
  youLabel: string;
}) {
  const t = useTranslations("adminUsers");
  const roleLabel =
    locale === "en" ? ROLE_LABELS[user.role].en : ROLE_LABELS[user.role].id;
  const avatarSrc = toBrowserMediaUrl(user.image);
  const isSelf = user.id === currentUserId;

  return (
    <tr className="border-b border-charcoal/8 transition-colors hover:bg-soft/40">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.name} /> : null}
            <AvatarFallback className="bg-brand/10 text-xs font-bold text-brand">
              {initials(user.name) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {user.name}
              {isSelf ? (
                <span className="ml-1.5 text-xs font-medium text-charcoal/45">
                  ({youLabel})
                </span>
              ) : null}
            </p>
            <p className="truncate text-xs text-charcoal/55">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <Badge className="rounded-full border-transparent bg-brand/10 px-2.5 py-0.5 text-brand">
          {roleLabel}
        </Badge>
      </td>
      <td className="px-3 py-3.5">
        <Badge
          className={cn(
            "rounded-full border-transparent px-2.5 py-0.5",
            user.status === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-charcoal/10 text-charcoal/70",
          )}
        >
          {t(`status.${user.status}`)}
        </Badge>
      </td>
      <td className="px-3 py-3.5 text-charcoal/70">
        {formatDate(user.lastLoginAt, locale)}
      </td>
      <td className="px-5 py-3.5 text-right">
        <Button
          type="button"
          variant="outline"
          className="h-9 cursor-pointer rounded-xl font-semibold"
          onClick={onDetails}
        >
          {detailsLabel}
        </Button>
      </td>
    </tr>
  );
}

function UserMobileCard({
  user,
  locale,
  currentUserId,
  onDetails,
  detailsLabel,
  youLabel,
  lastLoginLabel,
}: {
  user: AdminUserListItem;
  locale: string;
  currentUserId: string;
  onDetails: () => void;
  detailsLabel: string;
  youLabel: string;
  lastLoginLabel: string;
}) {
  const t = useTranslations("adminUsers");
  const roleLabel =
    locale === "en" ? ROLE_LABELS[user.role].en : ROLE_LABELS[user.role].id;
  const avatarSrc = toBrowserMediaUrl(user.image);
  const isSelf = user.id === currentUserId;

  return (
    <article className="rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="size-11">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.name} /> : null}
          <AvatarFallback className="bg-brand/10 text-sm font-bold text-brand">
            {initials(user.name) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">
            {user.name}
            {isSelf ? (
              <span className="ml-1 text-xs font-medium text-charcoal/45">
                ({youLabel})
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-charcoal/55">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className="rounded-full border-transparent bg-brand/10 px-2.5 py-0.5 text-brand">
              {roleLabel}
            </Badge>
            <Badge
              className={cn(
                "rounded-full border-transparent px-2.5 py-0.5",
                user.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-charcoal/10 text-charcoal/70",
              )}
            >
              {t(`status.${user.status}`)}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-charcoal/55">
            {lastLoginLabel}: {formatDate(user.lastLoginAt, locale)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-10 w-full cursor-pointer rounded-xl font-semibold"
        onClick={onDetails}
      >
        {detailsLabel}
      </Button>
    </article>
  );
}
