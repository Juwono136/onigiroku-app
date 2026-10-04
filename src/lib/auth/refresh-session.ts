import { authClient } from "@/lib/auth/client";

/**
 * Force-refresh the Better Auth session (bypass cookie cache) and update
 * client stores so chrome like the navbar avatar reflects profile edits
 * without a hard reload.
 */
export async function refreshAuthSession() {
  await authClient.getSession({
    query: { disableCookieCache: true },
  });
}
