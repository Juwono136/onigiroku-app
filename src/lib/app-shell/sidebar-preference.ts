import type { UserRole } from "@/lib/auth/roles";

const LEGACY_KEY = "onigiroku.app.sidebarCollapsed";

export function sidebarPreferenceKey(role: UserRole) {
  return `onigiroku.app.sidebarCollapsed.${role}`;
}

/** Student expand/collapse lasts for the browser tab session only. */
function studentStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function adminStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSidebarCollapsed(
  role: UserRole,
  fallback: boolean,
): boolean {
  try {
    if (role === "USER") {
      const raw = studentStore()?.getItem(sidebarPreferenceKey(role));
      if (raw === "1" || raw === "0") return raw === "1";
      return fallback;
    }
    const store = adminStore();
    const raw = store?.getItem(sidebarPreferenceKey(role));
    if (raw === "1" || raw === "0") return raw === "1";
    const legacy = store?.getItem(LEGACY_KEY);
    if (legacy === "1" || legacy === "0") {
      store?.setItem(sidebarPreferenceKey(role), legacy);
      return legacy === "1";
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function writeSidebarCollapsed(role: UserRole, collapsed: boolean) {
  try {
    const value = collapsed ? "1" : "0";
    if (role === "USER") {
      studentStore()?.setItem(sidebarPreferenceKey(role), value);
      // Drop stale cross-login preference from older builds.
      adminStore()?.removeItem(sidebarPreferenceKey(role));
      return;
    }
    adminStore()?.setItem(sidebarPreferenceKey(role), value);
  } catch {
    // ignore
  }
}

/** Call on logout so the next student login starts collapsed again. */
export function clearStudentSidebarPreference() {
  try {
    window.sessionStorage?.removeItem(sidebarPreferenceKey("USER"));
    window.localStorage?.removeItem(sidebarPreferenceKey("USER"));
    window.localStorage?.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}
