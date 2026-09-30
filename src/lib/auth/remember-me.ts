/**
 * Client-side "Remember me" for login form (email + password).
 * TTL: 24 hours. Stored only on this device (localStorage).
 *
 * Note: Persisting passwords client-side is a convenience trade-off for trusted
 * personal devices. Cleared automatically after expiry or when unchecked.
 */

const STORAGE_KEY = "onigiroku.auth.rememberMe.v1";
export const REMEMBER_ME_TTL_MS = 24 * 60 * 60 * 1000;

export type RememberMeCredentials = {
  email: string;
  password: string;
};

type RememberMeRecord = RememberMeCredentials & {
  expiresAt: number;
};

function encode(payload: RememberMeRecord): string {
  // Obfuscation only — not cryptographic protection.
  const json = JSON.stringify(payload);
  return typeof window !== "undefined"
    ? window.btoa(unescape(encodeURIComponent(json)))
    : "";
}

function decode(raw: string): RememberMeRecord | null {
  try {
    const json = decodeURIComponent(escape(window.atob(raw)));
    const parsed = JSON.parse(json) as RememberMeRecord;
    if (
      typeof parsed?.email !== "string" ||
      typeof parsed?.password !== "string" ||
      typeof parsed?.expiresAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRememberMe() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function saveRememberMe(credentials: RememberMeCredentials) {
  if (typeof window === "undefined") return;
  const record: RememberMeRecord = {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
    expiresAt: Date.now() + REMEMBER_ME_TTL_MS,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, encode(record));
  } catch {
    // ignore
  }
}

/** Returns credentials if still valid; otherwise clears storage and returns null. */
export function loadRememberMe(): RememberMeCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const record = decode(raw);
    if (!record) {
      clearRememberMe();
      return null;
    }
    if (Date.now() > record.expiresAt) {
      clearRememberMe();
      return null;
    }
    return { email: record.email, password: record.password };
  } catch {
    clearRememberMe();
    return null;
  }
}
