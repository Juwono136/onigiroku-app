import type { AuthSession } from "@/lib/auth/session";
import { getSessionRole } from "@/lib/auth/session";

/**
 * Extension point for paid access to a learning category.
 *
 * Access is decided in the Go API (`assertCategoryAccess`). While
 * LEARNING_PAYWALL_ENABLED is off, any signed-in USER or ADMIN may open
 * published paths. When the flag is on, a category is open if its plan_key
 * is `free` or the user has an active `user_learning_access` grant. A payment
 * gateway writes that grant; this app does not talk to a gateway.
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
