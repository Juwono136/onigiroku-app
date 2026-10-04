import { callGoApiWithActor } from "@/lib/api/go-client";
import type {
  AdminUserDetail,
  ListUsersInput,
  ListUsersResult,
} from "@/lib/admin/users";

function goError(code: string, message: string) {
  return new Error(code || message);
}

export async function goListUsers(
  actorId: string,
  input: ListUsersInput,
): Promise<ListUsersResult> {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    search: input.search ?? "",
    role: input.role ?? "ALL",
    status: input.status ?? "ALL",
    scope: input.scope ?? "active",
    sortBy: input.sortBy ?? "createdAt",
    sortDir: input.sortDir ?? "desc",
  });

  const result = await callGoApiWithActor<ListUsersResult>(
    `/api/admin/users?${params.toString()}`,
    { userId: actorId, role: "ADMIN" },
  );

  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goGetUser(
  actorId: string,
  userId: string,
): Promise<AdminUserDetail> {
  const result = await callGoApiWithActor<AdminUserDetail>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "USER_NOT_FOUND", result.error?.message ?? "USER_NOT_FOUND");
  }
  return result.data;
}

export async function goUpdateUser(
  actorId: string,
  userId: string,
  patch: { role?: string; status?: string },
): Promise<AdminUserDetail> {
  const result = await callGoApiWithActor<AdminUserDetail>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "PATCH", body: patch },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "UPDATE_FAILED", result.error?.message ?? "UPDATE_FAILED");
  }
  return result.data;
}

export async function goSoftDeleteUser(
  actorId: string,
  userId: string,
): Promise<AdminUserDetail> {
  const result = await callGoApiWithActor<AdminUserDetail>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "DELETE" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "DELETE_FAILED", result.error?.message ?? "DELETE_FAILED");
  }
  return result.data;
}

export async function goRestoreUser(
  actorId: string,
  userId: string,
): Promise<AdminUserDetail> {
  const result = await callGoApiWithActor<AdminUserDetail>(
    `/api/admin/users/${encodeURIComponent(userId)}/restore`,
    { userId: actorId, role: "ADMIN" },
    { method: "POST" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "RESTORE_FAILED", result.error?.message ?? "RESTORE_FAILED");
  }
  return result.data;
}

export async function goHardDeleteUser(
  actorId: string,
  userId: string,
): Promise<{ id: string }> {
  const result = await callGoApiWithActor<{ id: string }>(
    `/api/admin/users/${encodeURIComponent(userId)}/hard-delete`,
    { userId: actorId, role: "ADMIN" },
    { method: "POST" },
  );
  if (!result.success || !result.data) {
    throw goError(
      result.error?.code ?? "HARD_DELETE_FAILED",
      result.error?.message ?? "HARD_DELETE_FAILED",
    );
  }
  return result.data;
}
