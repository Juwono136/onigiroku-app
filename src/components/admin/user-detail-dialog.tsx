"use client";

import {
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

  const roleLabel =
    locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id;
  const avatarSrc = toBrowserMediaUrl(detail?.image ?? null);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,720px)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-charcoal/10 p-0 shadow-xl sm:max-w-xl">
          <DialogHeader className="gap-1 border-b border-charcoal/10 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <DialogTitle className="pr-8 text-lg font-bold tracking-tight text-ink">
              {t("detail.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-charcoal/70">
              {t("detail.subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {loading || !detail ? (
              <div className="flex min-h-48 items-center justify-center text-charcoal/55">
                <Loader2 className="size-6 animate-spin" aria-hidden />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <Avatar
                    size="lg"
                    className="size-16 rounded-2xl after:rounded-2xl"
                  >
                    {avatarSrc ? (
                      <AvatarImage src={avatarSrc} alt={detail.name} />
                    ) : null}
                    <AvatarFallback className="rounded-2xl bg-brand/10 text-base font-bold text-brand">
                      {initials(detail.name) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-ink">
                      {detail.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-charcoal/70">
                      <Mail className="size-3.5 shrink-0" aria-hidden />
                      {detail.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge className="rounded-full border-transparent bg-brand/10 px-2.5 py-0.5 text-brand">
                        {roleLabel}
                      </Badge>
                      <Badge
                        className={cn(
                          "rounded-full border-transparent px-2.5 py-0.5",
                          detail.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-charcoal/10 text-charcoal/70",
                        )}
                      >
                        {t(`status.${detail.status}`)}
                      </Badge>
                      {inTrash ? (
                        <Badge className="rounded-full border-transparent bg-destructive/10 px-2.5 py-0.5 text-destructive">
                          {t("status.TRASH")}
                        </Badge>
                      ) : null}
                      {isSelf ? (
                        <Badge className="rounded-full border-transparent bg-soft px-2.5 py-0.5 text-charcoal/70">
                          {t("detail.you")}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <dl className="grid gap-3 rounded-2xl border border-charcoal/10 bg-soft/40 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.emailVerified")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {detail.emailVerified
                        ? t("fields.verified")
                        : t("fields.unverified")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.locale")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink uppercase">
                      {detail.locale}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.providers")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {detail.providers.length
                        ? detail.providers.join(", ")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.sessions")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {detail.sessionCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.lastLogin")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {formatDate(detail.lastLoginAt, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                      {t("fields.createdAt")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {formatDate(detail.createdAt, locale)}
                    </dd>
                  </div>
                  {inTrash ? (
                    <>
                      <div>
                        <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                          {t("fields.deletedAt")}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-ink">
                          {formatDate(detail.deletedAt, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold tracking-wide text-charcoal/45 uppercase">
                          {t("fields.trashExpires")}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-ink">
                          {formatDate(detail.trashExpiresAt, locale)}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                {!inTrash && !isSelf ? (
                  <div className="space-y-3 rounded-2xl border border-charcoal/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Shield className="size-4 text-brand" aria-hidden />
                      {t("detail.manageTitle")}
                    </p>
                    <p className="text-xs leading-relaxed text-charcoal/60">
                      {t("detail.manageHint")}
                    </p>
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
                          className="h-10 w-full cursor-pointer rounded-xl border border-charcoal/15 bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
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
                          className="h-10 w-full cursor-pointer rounded-xl border border-charcoal/15 bg-white px-3 text-sm font-medium text-ink outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                        >
                          <option value="ACTIVE">{t("status.ACTIVE")}</option>
                          <option value="INACTIVE">
                            {t("status.INACTIVE")}
                          </option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}

                {isSelf ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                    {t("detail.selfGuard")}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {detail ? (
            <div className="flex flex-col gap-2 border-t border-charcoal/10 bg-soft/60 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
              {!inTrash && !isSelf ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !dirty}
                    className="h-10 cursor-pointer rounded-xl font-semibold"
                    onClick={() => setConfirm("save")}
                  >
                    <UserRound className="size-4" aria-hidden />
                    {t("actions.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    className="h-10 cursor-pointer rounded-xl font-semibold"
                    onClick={() => setConfirm("softDelete")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {t("actions.moveToTrash")}
                  </Button>
                </>
              ) : null}
              {inTrash && !isSelf ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    className="h-10 cursor-pointer rounded-xl font-semibold"
                    onClick={() => setConfirm("restore")}
                  >
                    {t("actions.restore")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    className="h-10 cursor-pointer rounded-xl font-semibold"
                    onClick={() => setConfirm("hardDelete")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {t("actions.hardDelete")}
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                className="h-10 cursor-pointer rounded-xl font-semibold"
                onClick={() => onOpenChange(false)}
              >
                {t("actions.close")}
              </Button>
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
