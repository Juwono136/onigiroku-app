/**
 * Onigiroku auth roles (PRD: USER + ADMIN).
 * Display names map to product language; enum stays extensible for future roles.
 */

export const USER_ROLES = ["USER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Product-facing labels (not DB values). */
export const ROLE_LABELS: Record<UserRole, { id: string; en: string }> = {
  USER: { id: "Peserta", en: "Student" },
  ADMIN: { id: "Super Admin", en: "Super Admin" },
};

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function normalizeRole(value: unknown): UserRole {
  return isUserRole(value) ? value : "USER";
}

/** Post-login destination by role. */
export function getDashboardPath(role: unknown): "/dashboard" | "/admin" {
  return normalizeRole(role) === "ADMIN" ? "/admin" : "/dashboard";
}

export function isAdminRole(role: unknown): boolean {
  return normalizeRole(role) === "ADMIN";
}
