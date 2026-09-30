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

export async function requireSession(options?: {
  locale?: string;
  /** Absolute app path without locale prefix, e.g. /dashboard */
  callbackPath?: string;
}): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    const locale = options?.locale;
    const loginPath =
      locale && locale !== "id" ? `/${locale}/login` : "/login";
    const callback = options?.callbackPath
      ? `?callbackUrl=${encodeURIComponent(options.callbackPath)}`
      : "";
    redirect(`${loginPath}${callback}`);
  }
  return session;
}

export async function requireRole(
  role: UserRole,
  options?: { locale?: string },
): Promise<AuthSession> {
  const session = await requireSession(options);
  const current = getSessionRole(session);
  if (current !== role) {
    redirect(getDashboardPath(current));
  }
  return session;
}

export function resolvePostLoginPath(session: AuthSession): string {
  return getDashboardPath(getSessionRole(session));
}

export function sessionIsAdmin(session: AuthSession): boolean {
  return isAdminRole(getSessionRole(session));
}
