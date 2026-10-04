import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { getLoginHistoryPage } from "@/lib/settings/login-history";
import { loginHistoryQuerySchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Paginated login / session history for the last 7 days.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const parsed = loginHistoryQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    pageSize: url.searchParams.get("pageSize") ?? 10,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid query" },
      },
      { status: 422 },
    );
  }

  try {
    const data = await getLoginHistoryPage({
      userId: session.user.id,
      currentSessionToken: session.session.token,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Login history query failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: "HISTORY_FAILED", message: "Could not load history" },
      },
      { status: 500 },
    );
  }
}
