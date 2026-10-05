"use client";

import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
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

import {
  RoleBadge,
  StatusBadge,
  roleAccentClass,
  roleAvatarFallbackClass,
} from "@/components/admin/user-badges";
import { UserDetailDialog } from "@/components/admin/user-detail-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
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
        <header className="mb-5 space-y-3 sm:mb-7">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
            {t("eyebrow")}
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-charcoal/10 bg-white/85 px-3.5 py-2 text-sm font-semibold text-ink shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur">
                <span className="flex size-7 items-center justify-center rounded-xl bg-ink/5 text-ink">
                  <Users className="size-3.5" aria-hidden />
                </span>
                {t("totalLabel", { count: total })}
              </div>
            </div>
          </div>
        </header>

        <div className="overflow-hidden rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-elevated)] shadow-[0_22px_48px_-30px_rgba(15,23,42,0.4)]">
          <div className="flex flex-col gap-3.5 border-b border-charcoal/10 bg-gradient-to-b from-white/55 to-transparent p-4 sm:p-5">
            <div
              className="inline-flex w-fit rounded-2xl border border-charcoal/10 bg-white/80 p-1 shadow-sm"
              role="tablist"
              aria-label={t("tabs.active")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={scope === "active"}
                onClick={() => {
                  setScope("active");
                  setPage(1);
                }}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all duration-200",
                  scope === "active"
                    ? "bg-ink text-white shadow-sm"
                    : "text-charcoal/65 hover:bg-soft hover:text-ink",
                )}
              >
                <Users className="size-3.5" aria-hidden />
                {t("tabs.active")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === "trash"}
                onClick={() => {
                  setScope("trash");
                  setPage(1);
                }}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all duration-200",
                  scope === "trash"
                    ? "bg-ink text-white shadow-sm"
                    : "text-charcoal/65 hover:bg-soft hover:text-ink",
                )}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {t("tabs.trash")}
              </button>
            </div>

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
                  className="h-11 rounded-2xl border-charcoal/12 bg-white pl-10 pr-10 text-sm shadow-sm"
                  aria-label={t("searchPlaceholder")}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-charcoal/45 transition-colors hover:bg-soft hover:text-ink"
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
                {filtersOpen ? t("actions.hideFilters") : t("actions.showFilters")}
              </Button>

              <div
                className={cn(
                  "grid gap-2 sm:grid-cols-3 lg:flex lg:items-center",
                  filtersOpen ? "grid" : "hidden lg:flex",
                )}
              >
                <FilterSelect
                  ariaLabel={t("fields.role")}
                  value={role}
                  onValueChange={(next) => {
                    setRole(next as UserRole | "ALL");
                    setPage(1);
                  }}
                  className="lg:w-40"
                  options={[
                    { value: "ALL", label: t("filters.allRoles") },
                    {
                      value: "USER",
                      label:
                        locale === "en"
                          ? ROLE_LABELS.USER.en
                          : ROLE_LABELS.USER.id,
                    },
                    {
                      value: "ADMIN",
                      label:
                        locale === "en"
                          ? ROLE_LABELS.ADMIN.en
                          : ROLE_LABELS.ADMIN.id,
                    },
                  ]}
                />
                <FilterSelect
                  ariaLabel={t("fields.status")}
                  value={status}
                  onValueChange={(next) => {
                    setStatus(next as UserStatus | "ALL");
                    setPage(1);
                  }}
                  className="lg:w-40"
                  options={[
                    { value: "ALL", label: t("filters.allStatus") },
                    { value: "ACTIVE", label: t("status.ACTIVE") },
                    { value: "INACTIVE", label: t("status.INACTIVE") },
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
                    { value: "createdAt:desc", label: t("sort.newest") },
                    { value: "createdAt:asc", label: t("sort.oldest") },
                    { value: "name:asc", label: t("sort.nameAsc") },
                    { value: "name:desc", label: t("sort.nameDesc") },
                    { value: "lastLoginAt:desc", label: t("sort.lastLogin") },
                    { value: "email:asc", label: t("sort.emailAsc") },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-charcoal/10 bg-[color-mix(in_oklab,var(--workspace-elevated)_92%,white)] text-[11px] font-semibold tracking-[0.08em] text-charcoal/50 uppercase backdrop-blur">
                <tr>
                  <th className="px-5 py-3.5">
                    <SortButton
                      active={sortBy === "name"}
                      dir={sortDir}
                      onClick={() => toggleSort("name")}
                      label={t("columns.user")}
                    />
                  </th>
                  <th className="px-3 py-3.5">
                    <SortButton
                      active={sortBy === "role"}
                      dir={sortDir}
                      onClick={() => toggleSort("role")}
                      label={t("columns.role")}
                    />
                  </th>
                  <th className="px-3 py-3.5">
                    <SortButton
                      active={sortBy === "status"}
                      dir={sortDir}
                      onClick={() => toggleSort("status")}
                      label={t("columns.status")}
                    />
                  </th>
                  <th className="px-3 py-3.5">
                    <SortButton
                      active={sortBy === "lastLoginAt"}
                      dir={sortDir}
                      onClick={() => toggleSort("lastLoginAt")}
                      label={t("columns.lastLogin")}
                    />
                  </th>
                  <th className="px-5 py-3.5 text-right">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/6">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-20 text-center">
                      <Loader2
                        className="mx-auto size-6 animate-spin text-brand"
                        aria-hidden
                      />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-20 text-center">
                      <EmptyState
                        scope={scope}
                        title={
                          scope === "trash" ? t("empty.trash") : t("empty.active")
                        }
                      />
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

          <div className="space-y-3 p-4 md:hidden">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                scope={scope}
                title={scope === "trash" ? t("empty.trash") : t("empty.active")}
              />
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

function EmptyState({
  scope,
  title,
}: {
  scope: UsersListScope;
  title: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-soft text-charcoal/45">
        {scope === "trash" ? (
          <Trash2 className="size-5" aria-hidden />
        ) : (
          <Users className="size-5" aria-hidden />
        )}
      </span>
      <p className="text-sm leading-relaxed text-charcoal/60">{title}</p>
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
          "size-3 transition-transform duration-200",
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
  const avatarSrc = toBrowserMediaUrl(user.image);
  const isSelf = user.id === currentUserId;

  return (
    <tr
      className={cn(
        "group border-l-2 border-l-transparent transition-colors duration-150 hover:bg-white/55",
        user.role === "ADMIN"
          ? "hover:border-l-[var(--charcoal)]"
          : "hover:border-l-[var(--info)]",
      )}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 ring-2 ring-white shadow-sm">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.name} /> : null}
            <AvatarFallback
              className={cn(
                "text-xs font-bold",
                roleAvatarFallbackClass(user.role),
              )}
            >
              {initials(user.name) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {user.name}
              {isSelf ? (
                <span className="ml-2 inline-flex rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-charcoal/55 uppercase">
                  {youLabel}
                </span>
              ) : null}
            </p>
            <p className="truncate text-xs text-charcoal/55">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <RoleBadge role={user.role} locale={locale} />
      </td>
      <td className="px-3 py-3">
        <StatusBadge
          status={user.status}
          label={t(`status.${user.status}`)}
        />
      </td>
      <td className="px-3 py-3 text-[13px] text-charcoal/65 tabular-nums">
        {formatDate(user.lastLoginAt, locale)}
      </td>
      <td className="px-5 py-3 text-right">
        <Button
          type="button"
          variant="ghost"
          className="h-9 cursor-pointer rounded-xl border border-transparent bg-white/70 px-3 font-semibold text-ink shadow-sm transition-all hover:border-charcoal/10 hover:bg-white group-hover:border-charcoal/10"
          onClick={onDetails}
        >
          <Eye className="size-3.5 opacity-70" aria-hidden />
          {detailsLabel}
          <ChevronRight className="size-3.5 opacity-50" aria-hidden />
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
  const avatarSrc = toBrowserMediaUrl(user.image);
  const isSelf = user.id === currentUserId;

  return (
    <article
      className={cn(
        "rounded-2xl border border-charcoal/10 bg-white p-4 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] transition-transform duration-200 active:scale-[0.995]",
        "border-l-[3px]",
        roleAccentClass(user.role),
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-12 ring-2 ring-white shadow-sm">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.name} /> : null}
          <AvatarFallback
            className={cn(
              "text-sm font-bold",
              roleAvatarFallbackClass(user.role),
            )}
          >
            {initials(user.name) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">
            {user.name}
            {isSelf ? (
              <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-charcoal/45 uppercase">
                ({youLabel})
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-charcoal/55">{user.email}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <RoleBadge role={user.role} locale={locale} />
            <StatusBadge
              status={user.status}
              label={t(`status.${user.status}`)}
            />
          </div>
          <p className="mt-2.5 text-xs text-charcoal/55">
            {lastLoginLabel}:{" "}
            <span className="font-medium text-charcoal/75">
              {formatDate(user.lastLoginAt, locale)}
            </span>
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-3.5 h-10 w-full cursor-pointer rounded-xl font-semibold"
        onClick={onDetails}
      >
        <Eye className="size-3.5 opacity-70" aria-hidden />
        {detailsLabel}
      </Button>
    </article>
  );
}
