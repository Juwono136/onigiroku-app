import { callGoApi, callGoApiWithActor } from "@/lib/api/go-client";
import type {
  MaterialDetail,
  MaterialListItem,
  MaterialListQuery,
  MaterialListResult,
  MaterialTag,
  MaterialUpsertInput,
} from "@/lib/materials/types";

function goError(code: string, message: string) {
  return new Error(code || message);
}

function listParams(input: MaterialListQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    search: input.search ?? "",
    visibility: input.visibility ?? "ALL",
    status: input.status ?? "ALL",
    locale: input.locale ?? "id",
    sortBy: input.sortBy ?? "publishedAt",
    sortDir: input.sortDir ?? "desc",
  });
  const multi = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (multi.length > 1) {
    params.set("tags", multi.join(","));
  } else if (multi.length === 1) {
    params.set("tag", multi[0]!);
  } else if (input.tag?.trim()) {
    params.set("tag", input.tag.trim());
  } else {
    params.set("tag", "");
  }
  if (input.featured !== undefined) {
    params.set("featured", String(input.featured));
  }
  return params;
}

/** Admin list (RequireAdminActor). */
export async function goAdminListMaterials(
  actorId: string,
  input: MaterialListQuery,
): Promise<MaterialListResult> {
  const result = await callGoApiWithActor<MaterialListResult>(
    `/api/admin/materials?${listParams(input).toString()}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goAdminGetMaterial(
  actorId: string,
  id: string,
): Promise<MaterialDetail> {
  const result = await callGoApiWithActor<MaterialDetail>(
    `/api/admin/materials/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

export async function goAdminCreateMaterial(
  actorId: string,
  body: MaterialUpsertInput,
): Promise<MaterialDetail> {
  const result = await callGoApiWithActor<MaterialDetail>(
    "/api/admin/materials",
    { userId: actorId, role: "ADMIN" },
    { method: "POST", body },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "CREATE_FAILED", result.error?.message ?? "CREATE_FAILED");
  }
  return result.data;
}

export async function goAdminUpdateMaterial(
  actorId: string,
  id: string,
  body: MaterialUpsertInput,
): Promise<MaterialDetail> {
  const result = await callGoApiWithActor<MaterialDetail>(
    `/api/admin/materials/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "PUT", body },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "UPDATE_FAILED", result.error?.message ?? "UPDATE_FAILED");
  }
  return result.data;
}

export async function goAdminSoftDeleteMaterial(
  actorId: string,
  id: string,
): Promise<void> {
  const result = await callGoApiWithActor<{ deleted: boolean }>(
    `/api/admin/materials/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "DELETE" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "DELETE_FAILED", result.error?.message ?? "DELETE_FAILED");
  }
}

export async function goAdminHardDeleteMaterial(
  actorId: string,
  id: string,
): Promise<void> {
  const result = await callGoApiWithActor<{ deleted: boolean }>(
    `/api/admin/materials/${encodeURIComponent(id)}/hard-delete`,
    { userId: actorId, role: "ADMIN" },
    { method: "POST" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "DELETE_FAILED", result.error?.message ?? "DELETE_FAILED");
  }
}

export async function goAdminSuggestTags(
  actorId: string,
  q: string,
  limit = 30,
): Promise<MaterialTag[]> {
  const params = new URLSearchParams({
    q,
    limit: String(Math.min(50, Math.max(1, limit))),
  });
  const result = await callGoApiWithActor<{ items: MaterialTag[] }>(
    `/api/admin/materials/tags?${params.toString()}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "TAGS_FAILED", result.error?.message ?? "TAGS_FAILED");
  }
  return result.data.items ?? [];
}

export async function goAdminDeleteTag(
  actorId: string,
  tagId: string,
): Promise<void> {
  const result = await callGoApiWithActor<{ deleted: boolean }>(
    `/api/admin/materials/tags/${encodeURIComponent(tagId)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "DELETE" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "DELETE_FAILED", result.error?.message ?? "DELETE_FAILED");
  }
}

/** Student list/get (RequireActor USER/ADMIN). */
export async function goStudentListMaterials(
  actorId: string,
  role: string,
  input: MaterialListQuery,
): Promise<MaterialListResult> {
  const result = await callGoApiWithActor<MaterialListResult>(
    `/api/materials?${listParams(input).toString()}`,
    { userId: actorId, role },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goStudentGetMaterial(
  actorId: string,
  role: string,
  slug: string,
): Promise<MaterialDetail> {
  const result = await callGoApiWithActor<MaterialDetail>(
    `/api/materials/${encodeURIComponent(slug)}`,
    { userId: actorId, role },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

/** Public news (internal secret only; no actor). Prefer RSC server-load. */
export async function goListNews(
  input: MaterialListQuery,
): Promise<MaterialListResult> {
  const result = await callGoApi<MaterialListResult>(
    `/api/news?${listParams(input).toString()}`,
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goGetNews(slug: string): Promise<MaterialDetail> {
  const result = await callGoApi<MaterialDetail>(
    `/api/news/${encodeURIComponent(slug)}`,
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

export async function goFeaturedNews(
  locale: "id" | "en" = "id",
): Promise<MaterialListItem[]> {
  const params = new URLSearchParams({ locale });
  const result = await callGoApi<{ items: MaterialListItem[] }>(
    `/api/news/featured?${params.toString()}`,
  );
  if (!result.success || !result.data) {
    return [];
  }
  return result.data.items ?? [];
}

export async function goListNewsTags(limit = 40): Promise<MaterialTag[]> {
  const params = new URLSearchParams({
    limit: String(Math.min(80, Math.max(1, limit))),
  });
  const result = await callGoApi<{ items: MaterialTag[] }>(
    `/api/news/tags?${params.toString()}`,
  );
  if (!result.success || !result.data) {
    return [];
  }
  return result.data.items ?? [];
}
