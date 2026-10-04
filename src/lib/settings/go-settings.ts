import { callGoApiWithActor } from "@/lib/api/go-client";
import type { LoginHistoryPage } from "@/lib/settings/login-history";

export async function goGetLoginHistory(input: {
  actorId: string;
  role?: string;
  currentSessionToken?: string | null;
  page: number;
  pageSize: number;
}): Promise<LoginHistoryPage> {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });

  const result = await callGoApiWithActor<LoginHistoryPage>(
    `/api/settings/login-history?${params.toString()}`,
    {
      userId: input.actorId,
      role: input.role,
      currentSessionToken: input.currentSessionToken,
    },
  );

  if (!result.success || !result.data) {
    const code = result.error?.code ?? "HISTORY_FAILED";
    throw new Error(code);
  }
  return result.data;
}
