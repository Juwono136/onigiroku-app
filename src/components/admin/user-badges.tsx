import { GraduationCap, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/lib/admin/users";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

/**
 * Role / status badges using PRD §13.2 semantic tokens only.
 * Brand red is reserved for CTA / active nav — never for role chips (reads as error).
 *
 * Student  → Info   (#1D4ED8)
 * Super Admin → Charcoal (#434040)
 * Active → Success (#15803D)
 * Inactive → Charcoal muted
 * Trash → Error (#B91C1C)
 */
const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  USER:
    "border-[color-mix(in_oklab,var(--info)_28%,white)] bg-[color-mix(in_oklab,var(--info)_10%,white)] text-[var(--info)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--info)_22%,transparent)]",
  ADMIN:
    "border-[color-mix(in_oklab,var(--charcoal)_28%,white)] bg-[color-mix(in_oklab,var(--charcoal)_10%,white)] text-[var(--charcoal)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--charcoal)_20%,transparent)]",
};

const ROLE_ICON = {
  USER: GraduationCap,
  ADMIN: Shield,
} as const;

export function roleBadgeClass(role: UserRole) {
  return ROLE_BADGE_CLASS[role] ?? ROLE_BADGE_CLASS.USER;
}

export function roleAccentClass(role: UserRole) {
  return role === "ADMIN" ? "border-l-[var(--charcoal)]" : "border-l-[var(--info)]";
}

export function roleAvatarFallbackClass(role: UserRole) {
  return role === "ADMIN"
    ? "bg-[color-mix(in_oklab,var(--charcoal)_12%,white)] text-[var(--charcoal)]"
    : "bg-[color-mix(in_oklab,var(--info)_12%,white)] text-[var(--info)]";
}

export function statusBadgeClass(status: UserStatus | "TRASH") {
  if (status === "ACTIVE") {
    return "border-[color-mix(in_oklab,var(--success)_30%,white)] bg-[color-mix(in_oklab,var(--success)_10%,white)] text-[var(--success)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--success)_22%,transparent)]";
  }
  if (status === "TRASH") {
    return "border-[color-mix(in_oklab,var(--destructive)_30%,white)] bg-[color-mix(in_oklab,var(--destructive)_10%,white)] text-[var(--destructive)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--destructive)_22%,transparent)]";
  }
  return "border-charcoal/15 bg-soft text-charcoal/75 ring-1 ring-inset ring-charcoal/10";
}

export function RoleBadge({
  role,
  locale,
  className,
  showIcon = true,
}: {
  role: UserRole;
  locale: string;
  className?: string;
  showIcon?: boolean;
}) {
  const label =
    locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id;
  const Icon = ROLE_ICON[role];

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-none",
        roleBadgeClass(role),
        className,
      )}
    >
      {showIcon ? <Icon className="size-3 shrink-0 opacity-80" aria-hidden /> : null}
      {label}
    </Badge>
  );
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: UserStatus | "TRASH";
  label: string;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-none",
        statusBadgeClass(status),
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status === "ACTIVE" && "bg-[var(--success)]",
          status === "INACTIVE" && "bg-charcoal/40",
          status === "TRASH" && "bg-[var(--destructive)]",
        )}
        aria-hidden
      />
      {label}
    </Badge>
  );
}
