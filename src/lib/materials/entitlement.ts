import type { AuthSession } from "@/lib/auth/session";
import { getSessionRole } from "@/lib/auth/session";

/**
 * Extension point for future Xendit-backed paid access to STUDENT materials.
 *
 * Today (access model 1A): any authenticated USER or ADMIN may access student
 * materials. Later, gate with `user_entitlement` / Xendit webhook grants via
 * something like `requireEntitled(session, "learning_materials")`.
 *
 * Do not wire checkout or webhooks here until billing goes live.
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
