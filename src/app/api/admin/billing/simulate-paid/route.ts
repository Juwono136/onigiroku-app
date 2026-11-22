import { NextResponse } from "next/server";

import { callGoApiWithActor } from "@/lib/api/go-client";
import { jsonError, mapLearningAdminError, requireAdminApi } from "@/lib/admin/guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Local/sandbox helper: mark a pending commerce_order paid + write grants
 * without a public DOKU webhook. Disabled unless ALLOW_PAYMENT_SIMULATION=true
 * and NODE_ENV is not production (enforced again in Go).
 */
export async function POST(request: Request) {
  const gate = await requireAdminApi(request);
  if ("response" in gate) return gate.response;

  if (process.env.NODE_ENV === "production") {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  const flag = (process.env.ALLOW_PAYMENT_SIMULATION ?? "").toLowerCase();
  if (flag !== "1" && flag !== "true" && flag !== "yes") {
    return jsonError(
      "Payment simulation is disabled. Set ALLOW_PAYMENT_SIMULATION=true for local testing.",
      403,
      "SIMULATION_DISABLED",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const invoiceOrOrderId =
    typeof body === "object" &&
    body &&
    "invoiceOrOrderId" in body &&
    typeof (body as { invoiceOrOrderId?: unknown }).invoiceOrOrderId === "string"
      ? (body as { invoiceOrOrderId: string }).invoiceOrOrderId.trim()
      : "";
  if (!invoiceOrOrderId) {
    return jsonError("invoiceOrOrderId is required", 422, "VALIDATION_ERROR");
  }

  try {
    const result = await callGoApiWithActor<{ simulated?: boolean }>(
      "/api/admin/billing/simulate-paid",
      { userId: gate.actorId, role: "ADMIN" },
      { method: "POST", body: { invoiceOrOrderId } },
    );
    if (!result.success) {
      throw Object.assign(new Error(result.error?.code ?? "SIMULATE_FAILED"), {
        detail: result.error?.message,
      });
    }
    return NextResponse.json({ success: true, data: result.data ?? { simulated: true } });
  } catch (error) {
    logger.error("Admin simulate paid failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapLearningAdminError(error);
  }
}
