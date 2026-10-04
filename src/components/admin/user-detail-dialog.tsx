"use client";

import {
  CalendarClock,
  CheckCircle2,
  Globe2,
  KeyRound,
  Loader2,
  Mail,
  MonitorSmartphone,
  Save,
  Shield,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import {
  RoleBadge,
  StatusBadge,
  roleAvatarFallbackClass,
} from "@/components/admin/user-badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminUserDetail, UserStatus } from "@/lib/admin/users";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  userId: string | null;
  currentUserId: string;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

type ConfirmKind = "save" | "softDelete" | "restore" | "hardDelete" | null;

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

function providerLabel(provider: string) {
  const value = provider.trim().toLowerCase();
  if (value === "credential") return "Email";
  if (value === "google") return "Google";
  return provider;
}

export function UserDetailDialog({
  open,
  userId,
  currentUserId,
  locale,
  onOpenChange,
  onChanged,
}: Props) {
  const t = useTranslations("adminUsers");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("USER");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const isSelf = Boolean(userId && userId === currentUserId);
  const inTrash = Boolean(detail?.deletedAt);
  const dirty =
    detail &&
    !inTrash &&
    (role !== detail.role || status !== detail.status);

  useEffect(() => {
    if (!open || !userId) return;

    const controller = new AbortController();
    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setLoading(true);
      setDetail(null);
      try {
        const res = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}`,
          { credentials: "same-origin", signal: controller.signal },
        );
        const payload = (await res.json()) as {
          success?: boolean;
          data?: AdminUserDetail;
          error?: { code?: string; message?: string };
        };
        if (!res.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.code ?? "GET_FAILED");
        }
        if (controller.signal.aborted) return;
        setDetail(payload.data);
        setRole(payload.data.role);
        setStatus(payload.data.status);
      } catch {
        if (controller.signal.aborted) return;
        toast.error(t("errors.loadDetail"));
        onOpenChange(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, userId, onOpenChange, t]);

  async function runAction(kind: Exclude<ConfirmKind, null>) {
    if (!userId || !detail) return;
    setPending(true);
    try {
      let res: Response;
      if (kind === "save") {
        res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, status }),
        });
      } else if (kind === "softDelete") {
        res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
      } else if (kind === "restore") {
        res = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}/restore`,
          { method: "POST", credentials: "same-origin" },
        );
      } else {
        res = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}/hard-delete`,
          { method: "POST", credentials: "same-origin" },
        );
      }

      const payload = (await res.json()) as {
        success?: boolean;
        data?: AdminUserDetail;
        error?: { code?: string; message?: string };
      };

      if (!res.ok || !payload.success) {
        const code = payload.error?.code ?? "ACTION_FAILED";
        toast.error(t(`errors.${code}` as "errors.ACTION_FAILED"));
        return;
      }

      if (kind === "hardDelete") {
        toast.success(t("toast.hardDeleted"));
        onOpenChange(false);
      } else if (kind === "softDelete") {
        toast.success(t("toast.softDeleted"));
        if (payload.data) {
          setDetail(payload.data);
          setRole(payload.data.role);
          setStatus(payload.data.status);
        }
      } else if (kind === "restore") {
        toast.success(t("toast.restored"));
        if (payload.data) {
          setDetail(payload.data);
          setRole(payload.data.role);
          setStatus(payload.data.status);
        }
      } else {
        toast.success(t("toast.updated"));
        if (payload.data) {
          setDetail(payload.data);
          setRole(payload.data.role);
          setStatus(payload.data.status);
        }
      }
      onChanged();
      setConfirm(null);
    } catch {
      toast.error(t("errors.ACTION_FAILED"));
    } finally {
      setPending(false);
    }
  }

  const avatarSrc = toBrowserMediaUrl(detail?.image ?? null);
  const displayRole = detail?.role ?? role;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,760px)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-[1.35rem] border-charcoal/10 p-0 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.55)] sm:max-w-xl">
          <DialogHeader className="relative gap-1 overflow-hidden border-b border-charcoal/10 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-90",
                displayRole === "ADMIN"
                  ? "bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--charcoal)_16%,transparent),transparent_55%)]"
                  : "bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--info)_16%,transparent),transparent_55%)]",
              )}
              aria-hidden
            />
            <DialogTitle className="relative pr-8 text-lg font-bold tracking-tight text-ink">
              {t("detail.title")}
            </DialogTitle>
            <DialogDescription className="relative text-sm text-charcoal/70">
              {t("detail.subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {loading || !detail ? (
              <div className="flex min-h-52 items-center justify-center text-charcoal/55">
                <Loader2 className="size-6 animate-spin" aria-hidden />
              </div>
            ) : (
              <div className="space-y-5">
                <section
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[var(--canvas)] via-white to-white p-4 sm:p-5",
                    displayRole === "ADMIN"
                      ? "border-[color-mix(in_oklab,var(--charcoal)_22%,white)]"
                      : "border-[color-mix(in_oklab,var(--info)_22%,white)]",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <Avatar
                      size="lg"
                      className="size-[4.25rem] rounded-2xl shadow-md ring-2 ring-white after:rounded-2xl"
                    >
                      {avatarSrc ? (
                        <AvatarImage src={avatarSrc} alt={detail.name} />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          "rounded-2xl text-base font-bold",
                          roleAvatarFallbackClass(displayRole),
                        )}
                      >
                        {initials(detail.name) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold tracking-tight text-ink">
                        {detail.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-charcoal/70">
                        <Mail className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        {detail.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <RoleBadge role={displayRole} locale={locale} />
                        <StatusBadge
                          status={detail.status}
                          label={t(`status.${detail.status}`)}
                        />
                        {inTrash ? (
                          <StatusBadge
                            status="TRASH"
                            label={t("status.TRASH")}
                          />
                        ) : null}
                        {isSelf ? (
                          <span className="inline-flex items-center rounded-full border border-charcoal/10 bg-white px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-charcoal/65 uppercase">
                            {t("detail.you")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <p className="mb-2.5 text-[11px] font-semibold tracking-[0.12em] text-charcoal/45 uppercase">
                    {t("detail.overviewTitle")}
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <MetaTile
                      icon={
                        detail.emailVerified ? (
                          <CheckCircle2 className="size-4 text-[var(--success)]" />
                        ) : (
                          <XCircle className="size-4 text-[var(--warning)]" />
                        )
                      }
                      label={t("fields.emailVerified")}
                      value={
                        detail.emailVerified
                          ? t("fields.verified")
                          : t("fields.unverified")
                      }
                    />
                    <MetaTile
                      icon={
                        <Globe2 className="size-4 text-[var(--info)]" />
                      }
                      label={t("fields.locale")}
                      value={detail.locale.toUpperCase()}
                    />
                    <MetaTile
                      icon={
                        <KeyRound className="size-4 text-[var(--charcoal)]" />
                      }
                      label={t("fields.providers")}
                      value={
                        detail.providers.length
                          ? detail.providers.map(providerLabel).join(" · ")
                          : "—"
                      }
                    />
                    <MetaTile
                      icon={
                        <MonitorSmartphone className="size-4 text-charcoal/70" />
                      }
                      label={t("fields.sessions")}
                      value={String(detail.sessionCount)}
                    />
                    <MetaTile
                      icon={
                        <CalendarClock className="size-4 text-charcoal/70" />
                      }
                      label={t("fields.lastLogin")}
                      value={formatDate(detail.lastLoginAt, locale)}
                    />
                    <MetaTile
                      icon={
                        <CalendarClock className="size-4 text-charcoal/70" />
                      }
                      label={t("fields.createdAt")}
                      value={formatDate(detail.createdAt, locale)}
                    />
                    {inTrash ? (
                      <>
                        <MetaTile
                          icon={
                            <Trash2 className="size-4 text-[var(--destructive)]" />
                          }
                          label={t("fields.deletedAt")}
                          value={formatDate(detail.deletedAt, locale)}
                        />
                        <MetaTile
                          icon={
                            <Trash2 className="size-4 text-[var(--destructive)]" />
                          }
                          label={t("fields.trashExpires")}
                          value={formatDate(detail.trashExpiresAt, locale)}
                        />
                      </>
                    ) : null}
                  </div>
                </section>

                {!inTrash && !isSelf ? (
                  <section className="space-y-3 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink">
                        <Shield className="size-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {t("detail.manageTitle")}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-charcoal/60">
                          {t("detail.manageHint")}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-charcoal/60">
                          {t("fields.role")}
                        </span>
                        <select
                          value={role}
                          onChange={(e) =>
                            setRole(e.target.value as UserRole)
                          }
                          className="h-11 w-full cursor-pointer rounded-xl border border-charcoal/12 bg-[var(--workspace-surface)] px-3 text-sm font-medium text-ink outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                        >
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
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-charcoal/60">
                          {t("fields.status")}
                        </span>
                        <select
                          value={status}
                          onChange={(e) =>
                            setStatus(e.target.value as UserStatus)
                          }
                          className="h-11 w-full cursor-pointer rounded-xl border border-charcoal/12 bg-[var(--workspace-surface)] px-3 text-sm font-medium text-ink outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                        >
                          <option value="ACTIVE">{t("status.ACTIVE")}</option>
                          <option value="INACTIVE">
                            {t("status.INACTIVE")}
                          </option>
                        </select>
                      </label>
                    </div>
                  </section>
                ) : null}

                {isSelf ? (
                  <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-3 text-xs leading-relaxed text-amber-950">
                    {t("detail.selfGuard")}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {detail ? (
            <div className="border-t border-charcoal/10 bg-[color-mix(in_oklab,var(--workspace-elevated)_70%,white)] px-4 py-3.5 sm:px-6">
              {/*
                UX: destructive left · dismiss + primary right.
                Mobile stacks primary/dismiss first, danger last.
              */}
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full sm:w-auto">
                  {!inTrash && !isSelf ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      className="h-10 w-full cursor-pointer rounded-xl border-[color-mix(in_oklab,var(--destructive)_35%,white)] bg-[color-mix(in_oklab,var(--destructive)_8%,white)] font-semibold text-[var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,white)] sm:w-auto"
                      onClick={() => setConfirm("softDelete")}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t("actions.moveToTrash")}
                    </Button>
                  ) : null}
                  {inTrash && !isSelf ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      className="h-10 w-full cursor-pointer rounded-xl border-[color-mix(in_oklab,var(--destructive)_35%,white)] bg-[color-mix(in_oklab,var(--destructive)_8%,white)] font-semibold text-[var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,white)] sm:w-auto"
                      onClick={() => setConfirm("hardDelete")}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t("actions.hardDelete")}
                    </Button>
                  ) : null}
                </div>

                <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    className="h-10 w-full cursor-pointer rounded-xl font-semibold text-charcoal/70 hover:text-ink sm:w-auto"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("actions.close")}
                  </Button>
                  {!inTrash && !isSelf ? (
                    <Button
                      type="button"
                      disabled={pending || !dirty}
                      className="h-10 w-full cursor-pointer rounded-xl bg-ink font-semibold text-white hover:bg-ink/90 disabled:opacity-45 sm:min-w-36 sm:w-auto"
                      onClick={() => setConfirm("save")}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Save className="size-4" aria-hidden />
                      )}
                      {t("actions.save")}
                    </Button>
                  ) : null}
                  {inTrash && !isSelf ? (
                    <Button
                      type="button"
                      disabled={pending}
                      className="h-10 w-full cursor-pointer rounded-xl bg-ink font-semibold text-white hover:bg-ink/90 sm:min-w-36 sm:w-auto"
                      onClick={() => setConfirm("restore")}
                    >
                      <Undo2 className="size-4" aria-hidden />
                      {t("actions.restore")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={confirm === "save"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={t("confirm.saveTitle")}
        description={t("confirm.saveBody")}
        confirmLabel={t("confirm.saveConfirm")}
        cancelLabel={t("actions.cancel")}
        pending={pending}
        pendingLabel={t("actions.saving")}
        onConfirm={() => void runAction("save")}
      />
      <AdminConfirmDialog
        open={confirm === "softDelete"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={t("confirm.softDeleteTitle")}
        description={t("confirm.softDeleteBody")}
        confirmLabel={t("confirm.softDeleteConfirm")}
        cancelLabel={t("actions.cancel")}
        pending={pending}
        pendingLabel={t("actions.deleting")}
        tone="danger"
        onConfirm={() => void runAction("softDelete")}
      />
      <AdminConfirmDialog
        open={confirm === "restore"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={t("confirm.restoreTitle")}
        description={t("confirm.restoreBody")}
        confirmLabel={t("confirm.restoreConfirm")}
        cancelLabel={t("actions.cancel")}
        pending={pending}
        pendingLabel={t("actions.restoring")}
        onConfirm={() => void runAction("restore")}
      />
      <AdminConfirmDialog
        open={confirm === "hardDelete"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={t("confirm.hardDeleteTitle")}
        description={t("confirm.hardDeleteBody")}
        confirmLabel={t("confirm.hardDeleteConfirm")}
        cancelLabel={t("actions.cancel")}
        pending={pending}
        pendingLabel={t("actions.deleting")}
        tone="danger"
        onConfirm={() => void runAction("hardDelete")}
      />
    </>
  );
}

function MetaTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-charcoal/8 bg-white/90 px-3.5 py-3 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.5)]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-soft/90">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.1em] text-charcoal/45 uppercase">
            {label}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
