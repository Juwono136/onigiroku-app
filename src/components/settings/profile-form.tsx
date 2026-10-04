"use client";

import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ProfileConfirmDialog } from "@/components/settings/profile-confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { refreshAuthSession } from "@/lib/auth/refresh-session";
import { toBrowserMediaUrl } from "@/lib/storage";
import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  updateProfileSchema,
} from "@/lib/validations/settings";
import { cn } from "@/lib/utils";

async function syncChromeAfterProfileChange() {
  await refreshAuthSession();
}

type Props = {
  initialName: string;
  initialEmail: string;
  initialImage?: string | null;
  roleLabel: string;
};

type PendingPhoto = {
  file: File;
  previewUrl: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ProfileSettingsForm({
  initialName,
  initialEmail,
  initialImage,
  roleLabel,
}: Props) {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(
    () => toBrowserMediaUrl(initialImage) ?? null,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [avatarPending, setAvatarPending] = useState(false);

  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [photoConfirmOpen, setPhotoConfirmOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);

  useEffect(() => {
    return () => {
      if (pendingPhoto?.previewUrl) {
        URL.revokeObjectURL(pendingPhoto.previewUrl);
      }
    };
  }, [pendingPhoto]);

  function fieldError(code: string) {
    try {
      return tAuth(`fieldErrors.${code}`);
    } catch {
      return code;
    }
  }

  function clearPendingPhoto() {
    setPendingPhoto((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function onRequestSaveName(event: React.FormEvent) {
    event.preventDefault();
    setNameError(null);
    const parsed = updateProfileSchema.safeParse({ name });
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message ?? "GENERIC";
      setNameError(fieldError(code));
      toast.error(fieldError(code));
      return;
    }
    if (parsed.data.name === initialName.trim()) return;
    setSaveConfirmOpen(true);
  }

  function confirmSaveName() {
    const parsed = updateProfileSchema.safeParse({ name });
    if (!parsed.success) {
      setSaveConfirmOpen(false);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.data.name }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        error?: { message?: string; code?: string };
      };
      if (!res.ok || !payload.success) {
        const code = payload.error?.code ?? payload.error?.message ?? "GENERIC";
        toast.error(t(`errors.${code}` as "errors.GENERIC"));
        return;
      }
      await syncChromeAfterProfileChange();
      setSaveConfirmOpen(false);
      toast.success(t("profile.saved"));
      router.refresh();
    });
  }

  function onAvatarPicked(file: File | null) {
    if (!file) return;
    if (!AVATAR_ALLOWED_MIME.has(file.type)) {
      toast.error(t("errors.AVATAR_TYPE_INVALID"));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t("errors.AVATAR_SIZE_INVALID"));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    clearPendingPhoto();
    const previewUrl = URL.createObjectURL(file);
    setPendingPhoto({ file, previewUrl });
    setPhotoConfirmOpen(true);
  }

  async function confirmUploadPhoto() {
    if (!pendingPhoto) return;
    setAvatarPending(true);
    try {
      const form = new FormData();
      form.set("file", pendingPhoto.file);
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        body: form,
      });
      const payload = (await res.json()) as {
        success?: boolean;
        data?: { image?: string };
        error?: { code?: string };
      };
      if (!res.ok || !payload.success) {
        toast.error(
          t(
            `errors.${payload.error?.code ?? "AVATAR_UPLOAD_FAILED"}` as "errors.GENERIC",
          ),
        );
        return;
      }
      setImage(toBrowserMediaUrl(payload.data?.image) ?? null);
      await syncChromeAfterProfileChange();
      setPhotoConfirmOpen(false);
      clearPendingPhoto();
      toast.success(t("profile.avatarSaved"));
      router.refresh();
    } catch {
      toast.error(t("errors.AVATAR_UPLOAD_FAILED"));
    } finally {
      setAvatarPending(false);
    }
  }

  async function confirmRemoveAvatar() {
    setAvatarPending(true);
    try {
      const res = await fetch("/api/settings/profile", { method: "DELETE" });
      const payload = (await res.json()) as {
        success?: boolean;
        error?: { code?: string };
      };
      if (!res.ok || !payload.success) {
        toast.error(
          t(
            `errors.${payload.error?.code ?? "AVATAR_DELETE_FAILED"}` as "errors.GENERIC",
          ),
        );
        return;
      }
      setImage(null);
      await syncChromeAfterProfileChange();
      setRemoveConfirmOpen(false);
      toast.success(t("profile.avatarRemoved"));
      router.refresh();
    } catch {
      toast.error(t("errors.AVATAR_DELETE_FAILED"));
    } finally {
      setAvatarPending(false);
    }
  }

  return (
    <section className="jp-rail rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-5 shadow-[0_14px_36px_-30px_rgba(67,64,64,0.5)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">{t("profile.title")}</h2>
          <p className="mt-1 text-sm text-charcoal/65">{t("profile.subtitle")}</p>
        </div>
        <span className="inline-flex rounded-full bg-brand/12 px-2.5 py-1 text-xs font-semibold text-brand">
          {roleLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-center gap-4 sm:w-[13.5rem] sm:flex-col sm:items-center sm:gap-3 sm:rounded-2xl sm:border sm:border-charcoal/8 sm:bg-[var(--workspace-elevated)]/80 sm:px-4 sm:py-4">
          <Avatar className="size-20 border border-charcoal/10 shadow-sm sm:size-[5.5rem]">
            {image ? (
              <AvatarImage key={image} src={image} alt={name} />
            ) : null}
            <AvatarFallback className="bg-brand/10 text-base font-semibold text-brand sm:text-lg">
              {initials(name) || <UserRound className="size-5" />}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => onAvatarPicked(e.target.files?.[0] ?? null)}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-full sm:flex-none">
            <div className="flex flex-wrap gap-2 sm:flex-col">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarPending || pending}
                className="h-9 cursor-pointer gap-1.5 rounded-xl sm:w-full"
                onClick={() => fileRef.current?.click()}
              >
                {avatarPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
                {t("profile.changePhoto")}
              </Button>
              {image ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={avatarPending || pending}
                  className="h-9 cursor-pointer gap-1.5 rounded-xl text-destructive sm:w-full"
                  onClick={() => setRemoveConfirmOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  {t("profile.removePhoto")}
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] leading-relaxed text-charcoal/50 sm:text-center">
              {t("profile.photoHint")}
            </p>
          </div>
        </div>

        <form onSubmit={onRequestSaveName} className="min-w-0 flex-1 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">{t("fields.name")}</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending || avatarPending}
              maxLength={80}
              className={cn(
                "h-11 rounded-xl border-charcoal/15 bg-[var(--workspace-elevated)]",
                nameError && "border-destructive",
              )}
              placeholder={t("profile.namePlaceholder")}
            />
            {nameError ? (
              <p className="text-xs text-destructive" role="alert">
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-email">{t("fields.email")}</Label>
            <Input
              id="settings-email"
              value={initialEmail}
              disabled
              className="h-11 rounded-xl border-charcoal/15 bg-soft/80 text-charcoal/70"
            />
            <p className="text-[11px] text-charcoal/50">
              {t("profile.emailLocked")}
            </p>
          </div>

          <Button
            type="submit"
            disabled={pending || avatarPending || name.trim() === initialName}
            className="h-11 w-full cursor-pointer rounded-xl font-semibold sm:w-auto sm:min-w-[10.5rem]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("profile.saving")}
              </>
            ) : (
              t("profile.save")
            )}
          </Button>
        </form>
      </div>

      <ProfileConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={setSaveConfirmOpen}
        title={t("profile.confirmSaveTitle")}
        description={t("profile.confirmSaveBody", { name: name.trim() })}
        confirmLabel={t("profile.confirmSave")}
        cancelLabel={t("profile.cancel")}
        pendingLabel={t("profile.saving")}
        pending={pending}
        onConfirm={confirmSaveName}
      />

      <ProfileConfirmDialog
        open={photoConfirmOpen}
        onOpenChange={(open) => {
          setPhotoConfirmOpen(open);
          if (!open) clearPendingPhoto();
        }}
        title={t("profile.confirmPhotoTitle")}
        description={t("profile.confirmPhotoBody")}
        confirmLabel={t("profile.confirmPhoto")}
        cancelLabel={t("profile.cancel")}
        pendingLabel={t("profile.uploading")}
        pending={avatarPending}
        onConfirm={confirmUploadPhoto}
        preview={
          pendingPhoto ? (
            <Avatar className="size-24 border border-charcoal/10 shadow-sm">
              <AvatarImage
                src={pendingPhoto.previewUrl}
                alt={pendingPhoto.file.name}
              />
              <AvatarFallback className="bg-brand/10 text-lg font-semibold text-brand">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
          ) : null
        }
      />

      <ProfileConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title={t("profile.confirmRemoveTitle")}
        description={t("profile.confirmRemoveBody")}
        confirmLabel={t("profile.confirmRemove")}
        cancelLabel={t("profile.cancel")}
        pendingLabel={t("profile.removing")}
        pending={avatarPending}
        tone="danger"
        onConfirm={confirmRemoveAvatar}
      />
    </section>
  );
}
