/**
 * Admin users — shared types + auth-gate helpers (Better Auth / Drizzle).
 * Domain CRUD lives in Go (`/api/admin/users`); see `go-users.ts`.
 */

import { eq, sql } from "drizzle-orm";

import { type UserRole, USER_ROLES } from "@/lib/auth/roles";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const SOFT_DELETE_RETENTION_DAYS = 30;

export type UserStatus = "ACTIVE" | "INACTIVE";
export type UsersListScope = "active" | "trash";

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  locale: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  lastLoginAt: string | null;
  providers: string[];
};

export type AdminUserDetail = AdminUserListItem & {
  sessionCount: number;
  trashExpiresAt: string | null;
};

export type ListUsersInput = {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole | "ALL";
  status?: UserStatus | "ALL";
  scope?: UsersListScope;
  sortBy?: "name" | "email" | "role" | "status" | "createdAt" | "lastLoginAt";
  sortDir?: "asc" | "desc";
};

export type ListUsersResult = {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function isUserRoleValue(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/** Block credential sign-in for inactive / soft-deleted accounts. */
export async function assertUserCanAuthenticate(email: string) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const [row] = await db
    .select({
      id: user.id,
      status: user.status,
      deletedAt: user.deletedAt,
    })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);

  if (!row) return;
  if (row.deletedAt) {
    throw new Error("ACCOUNT_DELETED");
  }
  if (row.status === "INACTIVE") {
    throw new Error("ACCOUNT_INACTIVE");
  }
}

/** Block session creation (incl. OAuth) for inactive / soft-deleted accounts. */
export async function assertUserIdCanAuthenticate(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      status: user.status,
      deletedAt: user.deletedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) throw new Error("USER_NOT_FOUND");
  if (row.deletedAt) throw new Error("ACCOUNT_DELETED");
  if (row.status === "INACTIVE") throw new Error("ACCOUNT_INACTIVE");
}
