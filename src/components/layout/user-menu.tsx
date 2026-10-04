"use client";

import {
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { LogoutConfirmDialog } from "@/components/auth/logout-confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";
import {
  getDashboardPath,
  normalizeRole,
  ROLE_LABELS,
} from "@/lib/auth/roles";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  compact?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function UserMenu({ user, compact }: Props) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const role = normalizeRole(user.role);
  const dashboardHref = getDashboardPath(role);
  const roleLabel = locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id;
  const avatarSrc = toBrowserMediaUrl(user.image);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-10 cursor-pointer rounded-full border border-charcoal/10 bg-white p-0 shadow-sm hover:bg-soft",
            compact && "size-9",
          )}
          aria-label={t("accountMenu")}
        >
          <Avatar size={compact ? "sm" : "default"} className="size-full">
            {avatarSrc ? (
              <AvatarImage key={avatarSrc} src={avatarSrc} alt={user.name} />
            ) : null}
            <AvatarFallback className="bg-brand/10 font-semibold text-brand">
              {initials(user.name) || <UserRound className="size-4" />}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[17rem] rounded-xl border-charcoal/10 p-1.5 shadow-lg sm:min-w-[18rem]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-2.5">
              <p className="truncate text-sm font-semibold text-ink">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-xs font-normal text-charcoal/60">
                {user.email}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-brand">
                {roleLabel}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-2.5 py-2"
              onClick={() => {
                // Defer so Base UI can release pointer capture before unmount.
                window.setTimeout(() => router.push(dashboardHref), 0);
              }}
            >
              <LayoutDashboard className="size-4 text-brand" aria-hidden />
              {t("dashboard")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-2.5 py-2"
              onClick={() => {
                window.setTimeout(() => router.push("/settings"), 0);
              }}
            >
              <Settings className="size-4 text-charcoal/70" aria-hidden />
              {t("settings")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer rounded-lg px-2.5 py-2"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="size-4" aria-hidden />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}

export function UserMenuSkeleton() {
  return (
    <div
      className="inline-flex size-10 items-center justify-center rounded-full border border-charcoal/10 bg-white"
      aria-hidden
    >
      <Loader2 className="size-4 animate-spin text-charcoal/40" />
    </div>
  );
}
