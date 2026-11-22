import { callGoApi, callGoApiWithActor } from "@/lib/api/go-client";
import type {
  CheckoutResult,
  ClassPackage,
  PackageListResult,
  PackageUpsertInput,
} from "@/lib/packages/types";

function goError(code: string, message: string) {
  const err = new Error(code || message) as Error & { detail?: string };
  if (message && message !== code) err.detail = message;
  return err;
}

export async function goPublicListPackages(query: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
}): Promise<PackageListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search ?? "",
    sortBy: query.sortBy ?? "position",
  });
  const result = await callGoApi<PackageListResult>(
    `/api/classes?${params.toString()}`,
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goPublicGetPackage(slug: string): Promise<ClassPackage> {
  const result = await callGoApi<ClassPackage>(
    `/api/classes/${encodeURIComponent(slug)}`,
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

export async function goAdminListPackages(
  actorId: string,
  query: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    sortBy?: string;
  },
): Promise<PackageListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search ?? "",
    status: query.status ?? "ALL",
    sortBy: query.sortBy ?? "position",
  });
  const result = await callGoApiWithActor<PackageListResult>(
    `/api/admin/classes?${params.toString()}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goAdminGetPackage(
  actorId: string,
  id: string,
): Promise<ClassPackage> {
  const result = await callGoApiWithActor<ClassPackage>(
    `/api/admin/classes/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

export async function goAdminCreatePackage(
  actorId: string,
  input: PackageUpsertInput,
): Promise<ClassPackage> {
  const result = await callGoApiWithActor<ClassPackage>(
    "/api/admin/classes",
    { userId: actorId, role: "ADMIN" },
    { method: "POST", body: input },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "CREATE_FAILED", result.error?.message ?? "CREATE_FAILED");
  }
  return result.data;
}

export async function goAdminUpdatePackage(
  actorId: string,
  id: string,
  input: PackageUpsertInput,
): Promise<ClassPackage> {
  const result = await callGoApiWithActor<ClassPackage>(
    `/api/admin/classes/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "PUT", body: input },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "UPDATE_FAILED", result.error?.message ?? "UPDATE_FAILED");
  }
  return result.data;
}

export async function goAdminArchivePackage(actorId: string, id: string) {
  const result = await callGoApiWithActor(
    `/api/admin/classes/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "DELETE" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "ARCHIVE_FAILED", result.error?.message ?? "ARCHIVE_FAILED");
  }
}

export async function goAdminHardDeletePackage(actorId: string, id: string) {
  const result = await callGoApiWithActor(
    `/api/admin/classes/${encodeURIComponent(id)}/hard-delete`,
    { userId: actorId, role: "ADMIN" },
    { method: "POST" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "DELETE_FAILED", result.error?.message ?? "DELETE_FAILED");
  }
}

export async function goAdminPackagesForCategory(
  actorId: string,
  categoryId: string,
): Promise<ClassPackage[]> {
  const result = await callGoApiWithActor<{ items: ClassPackage[] }>(
    `/api/admin/learning/categories/${encodeURIComponent(categoryId)}/packages`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data.items ?? [];
}

export async function goCreateCheckout(
  actor: { userId: string; role: string; name?: string | null; email?: string | null },
  packageSlug: string,
): Promise<CheckoutResult> {
  const result = await callGoApiWithActor<CheckoutResult>(
    "/api/billing/checkout",
    {
      userId: actor.userId,
      role: actor.role,
      name: actor.name,
      email: actor.email,
    },
    { method: "POST", body: { packageSlug } },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "CHECKOUT_FAILED", result.error?.message ?? "CHECKOUT_FAILED");
  }
  return result.data;
}
