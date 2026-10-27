import { callGoApiWithActor } from "@/lib/api/go-client";
import type {
  CategoryInput,
  CategoryListResult,
  LearningCategory,
  QuizAttemptDetail,
  QuizAttemptListResult,
  QuizSubmitResult,
  StudentCategoryDetail,
} from "@/lib/learning/types";
import type { LessonProgress } from "@/lib/learning/types";

function goError(code: string, message: string) {
  const err = new Error(code || message) as Error & { detail?: string };
  if (message && message !== code) err.detail = message;
  return err;
}

export async function goAdminListCategories(
  actorId: string,
  query: { page: number; pageSize: number; search?: string; status?: string; sortBy?: string; sortDir?: string },
): Promise<CategoryListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search ?? "",
    status: query.status ?? "ALL",
    sortBy: query.sortBy ?? "position",
    sortDir: query.sortDir ?? "asc",
  });
  const result = await callGoApiWithActor<CategoryListResult>(
    `/api/admin/learning/categories?${params.toString()}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goAdminCreateCategory(
  actorId: string,
  input: CategoryInput,
): Promise<LearningCategory> {
  const result = await callGoApiWithActor<LearningCategory>(
    "/api/admin/learning/categories",
    { userId: actorId, role: "ADMIN" },
    { method: "POST", body: input },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "CREATE_FAILED", result.error?.message ?? "CREATE_FAILED");
  }
  return result.data;
}

export async function goAdminGetCategory(
  actorId: string,
  id: string,
): Promise<LearningCategory> {
  const result = await callGoApiWithActor<LearningCategory>(
    `/api/admin/learning/categories/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

export async function goAdminUpdateCategory(
  actorId: string,
  id: string,
  input: CategoryInput,
): Promise<LearningCategory> {
  const result = await callGoApiWithActor<LearningCategory>(
    `/api/admin/learning/categories/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "PUT", body: input },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "UPDATE_FAILED", result.error?.message ?? "UPDATE_FAILED");
  }
  return result.data;
}

export async function goAdminArchiveCategory(actorId: string, id: string) {
  const result = await callGoApiWithActor(
    `/api/admin/learning/categories/${encodeURIComponent(id)}`,
    { userId: actorId, role: "ADMIN" },
    { method: "DELETE" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "ARCHIVE_FAILED", result.error?.message ?? "ARCHIVE_FAILED");
  }
}

export async function goAdminHardDeleteCategory(actorId: string, id: string) {
  const result = await callGoApiWithActor(
    `/api/admin/learning/categories/${encodeURIComponent(id)}/hard-delete`,
    { userId: actorId, role: "ADMIN" },
    { method: "POST" },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "DELETE_FAILED", result.error?.message ?? "DELETE_FAILED");
  }
}

export async function goAdminReorderLessons(
  actorId: string,
  categoryId: string,
  ids: string[],
) {
  const result = await callGoApiWithActor(
    `/api/admin/learning/categories/${encodeURIComponent(categoryId)}/lessons/order`,
    { userId: actorId, role: "ADMIN" },
    { method: "PUT", body: { ids } },
  );
  if (!result.success) {
    throw goError(result.error?.code ?? "REORDER_FAILED", result.error?.message ?? "REORDER_FAILED");
  }
}

export async function goAdminBulkDeleteLessons(
  actorId: string,
  categoryId: string,
  ids: string[],
): Promise<{ deleted: number }> {
  const result = await callGoApiWithActor<{ deleted: number }>(
    `/api/admin/learning/categories/${encodeURIComponent(categoryId)}/lessons/bulk-delete`,
    { userId: actorId, role: "ADMIN" },
    { method: "POST", body: { ids } },
  );
  if (!result.success || !result.data) {
    throw goError(
      result.error?.code ?? "DELETE_FAILED",
      result.error?.message ?? "DELETE_FAILED",
    );
  }
  return result.data;
}

export async function goStudentListCategories(
  actorId: string,
  role: string,
  query: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortDir?: string;
    tags?: string[];
  },
): Promise<CategoryListResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search ?? "",
    sortBy: query.sortBy ?? "position",
    sortDir: query.sortDir ?? "asc",
  });
  const tags = (query.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tags.length === 1) params.set("tag", tags[0]!);
  else if (tags.length > 1) params.set("tags", tags.join(","));
  const result = await callGoApiWithActor<CategoryListResult>(
    `/api/learning/categories?${params.toString()}`,
    { userId: actorId, role },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goStudentListCategoryTags(
  actorId: string,
  role: string,
  limit = 40,
): Promise<import("@/lib/learning/types").LearningCategoryTag[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const result = await callGoApiWithActor<
    import("@/lib/learning/types").LearningCategoryTag[]
  >(`/api/learning/categories/tags?${params.toString()}`, { userId: actorId, role });
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "LIST_FAILED", result.error?.message ?? "LIST_FAILED");
  }
  return result.data;
}

export async function goStudentGetCategory(
  actorId: string,
  role: string,
  slug: string,
  locale: "id" | "en",
): Promise<StudentCategoryDetail> {
  const params = new URLSearchParams({ locale });
  const result = await callGoApiWithActor<StudentCategoryDetail>(
    `/api/learning/categories/${encodeURIComponent(slug)}?${params.toString()}`,
    { userId: actorId, role },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "NOT_FOUND", result.error?.message ?? "NOT_FOUND");
  }
  return result.data;
}

export async function goStudentTouchProgress(
  actorId: string,
  role: string,
  slug: string,
  readingPercent: number,
): Promise<LessonProgress> {
  const result = await callGoApiWithActor<LessonProgress>(
    `/api/materials/${encodeURIComponent(slug)}/progress`,
    { userId: actorId, role },
    { method: "POST", body: { readingPercent } },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "PROGRESS_FAILED", result.error?.message ?? "PROGRESS_FAILED");
  }
  return result.data;
}

export async function goStudentSubmitQuiz(
  actorId: string,
  role: string,
  slug: string,
  body: {
    attemptId: string;
    answers: Array<{
      questionId: string;
      selectedOptionId?: string;
      textAnswer?: string;
      knew?: boolean | null;
    }>;
  },
): Promise<QuizSubmitResult> {
  const result = await callGoApiWithActor<QuizSubmitResult>(
    `/api/materials/${encodeURIComponent(slug)}/quiz`,
    { userId: actorId, role },
    { method: "POST", body },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "QUIZ_FAILED", result.error?.message ?? "QUIZ_FAILED");
  }
  return result.data;
}

export async function goStudentListQuizAttempts(
  actorId: string,
  role: string,
  slug: string,
  limit = 50,
): Promise<QuizAttemptListResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  const result = await callGoApiWithActor<QuizAttemptListResult>(
    `/api/materials/${encodeURIComponent(slug)}/quiz/attempts?${params.toString()}`,
    { userId: actorId, role },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "HISTORY_FAILED", result.error?.message ?? "HISTORY_FAILED");
  }
  return result.data;
}

export async function goStudentGetQuizAttempt(
  actorId: string,
  role: string,
  slug: string,
  attemptId: string,
): Promise<QuizAttemptDetail> {
  const result = await callGoApiWithActor<QuizAttemptDetail>(
    `/api/materials/${encodeURIComponent(slug)}/quiz/attempts/${encodeURIComponent(attemptId)}`,
    { userId: actorId, role },
  );
  if (!result.success || !result.data) {
    throw goError(result.error?.code ?? "HISTORY_FAILED", result.error?.message ?? "HISTORY_FAILED");
  }
  return result.data;
}
