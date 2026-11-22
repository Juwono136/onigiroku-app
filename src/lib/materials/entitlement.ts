import type { AuthSession } from "@/lib/auth/session";
import { getSessionRole } from "@/lib/auth/session";

/**
 * Thin gate for student materials BFF routes.
 *
 * Path-level access is decided in the Go API (`assertCategoryAccess` using
 * `access_mode` + `user_feature_grant`). While LEARNING_PAYWALL_ENABLED is
 * off, any signed-in USER or ADMIN may open published paths. DOKU package
 * purchases write grants via commerce webhooks — see docs/PAYMENTS.md.
 */
export async function assertCanAccessStudentMaterials(
  session: AuthSession,
): Promise<boolean> {
  const role = getSessionRole(session);
  if (role !== "USER" && role !== "ADMIN") {
    return false;
  }
  // Future: return await hasActiveEntitlement(session.user.id, "learning_materials")
  return true;
}
