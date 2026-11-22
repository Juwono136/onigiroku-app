import { authClient } from "@/lib/auth/client";

type SessionAtomState = {
  refetch?: (queryParams?: {
    query?: Record<string, string | boolean>;
  }) => Promise<void>;
};

type AuthStore = {
  atoms?: {
    session?: { get: () => SessionAtomState };
    $sessionSignal?: { get: () => boolean; set: (value: boolean) => void };
  };
  notify?: (signal: "$sessionSignal") => void;
};

/**
 * Force-refresh the Better Auth client session so chrome (navbar avatar, menus)
 * reflects profile edits without a hard reload.
 *
 * `auth.api.updateUser` runs on the server BFF, so the client session atom is
 * not notified automatically — we must refetch (bypass cookie cache) and/or
 * toggle `$sessionSignal`.
 */
export async function refreshAuthSession() {
  const store = (authClient as unknown as { $store?: AuthStore }).$store;
  const sessionState = store?.atoms?.session?.get();

  if (typeof sessionState?.refetch === "function") {
    await sessionState.refetch({
      query: { disableCookieCache: true },
    });
    return;
  }

  await authClient.getSession({
    query: { disableCookieCache: true },
  });

  if (typeof store?.notify === "function") {
    store.notify("$sessionSignal");
    return;
  }

  const signal = store?.atoms?.$sessionSignal;
  if (signal) {
    signal.set(!signal.get());
  }
}
