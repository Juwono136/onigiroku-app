import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/lib/auth";
import {
  getDashboardPath,
  isAdminRole,
  normalizeRole,
  type UserRole,
} from "@/lib/auth/roles";

export type AuthSession = Session;

/** Better Auth additionalFields are present at runtime; narrow for app code. */
export type AppUser = Session["user"] & {
  role?: string | null;
  locale?: string | null;
};

export function getSessionUser(session: AuthSession): AppUser {
  return session.user as AppUser;
}

export function getSessionRole(session: AuthSession): UserRole {
  return normalizeRole(getSessionUser(session).role);
}

export async function getServerSession(): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session ?? null;
}

function loginPathForLocale(locale?: string, callbackPath?: string) {
  const base = locale && locale !== "id" ? `/${locale}/login` : "/login";
  const callback = callbackPath
    ? `?callbackUrl=${encodeURIComponent(callbackPath)}`
    : "";
  return `${base}${callback}`;
}

/**
 * Guest-only pages (login/register/forgot/reset).
 * Authenticated users are sent to their role dashboard.
 */
export async function redirectIfAuthenticated(locale?: string) {
  const session = await getServerSession();
  if (session) {
    const path = getDashboardPath(getSessionRole(session));
    if (locale && locale !== "id") {
      redirect(`/${locale}${path}`);
    }
    redirect(path);
  }
}

export async function requireSession(options?: {
  locale?: string;
  /** Absolute app path without locale prefix, e.g. /dashboard */
  callbackPath?: string;
}): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    redirect(loginPathForLocale(options?.locale, options?.callbackPath));
  }
  return session;
}

export async function requireRole(
  role: UserRole,
  options?: { locale?: string; callbackPath?: string },
): Promise<AuthSession> {
  const session = await requireSession(options);
  const current = getSessionRole(session);
  if (current !== role) {
    const path = getDashboardPath(current);
    if (options?.locale && options.locale !== "id") {
      redirect(`/${options.locale}${path}`);
    }
    redirect(path);
  }
  return session;
}

export function resolvePostLoginPath(session: AuthSession): string {
  return getDashboardPath(getSessionRole(session));
}

export function sessionIsAdmin(session: AuthSession): boolean {
  return isAdminRole(getSessionRole(session));
}
