import { NextResponse } from "next/server";

import {
  getServerSession,
  getSessionRole,
  getSessionUser,
} from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { goGetLoginHistory } from "@/lib/settings/go-settings";
import { loginHistoryQuerySchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Paginated login / session history for the last 7 days (via Go domain API).
 */
export async function GET(request: Request) {
  const session = await getServerSession({ fresh: true });
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
    const user = getSessionUser(session);
    const data = await goGetLoginHistory({
      actorId: user.id,
      role: getSessionRole(session),
      currentSessionToken: session.session.token,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "HISTORY_FAILED";
    logger.error("Login history query failed", { error: code });

    if (code === "GO_API_UNAVAILABLE" || code === "SERVICE_UNAVAILABLE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GO_API_UNAVAILABLE",
            message: "Domain API is temporarily unavailable",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "HISTORY_FAILED", message: "Could not load history" },
      },
      { status: 500 },
    );
  }
}
