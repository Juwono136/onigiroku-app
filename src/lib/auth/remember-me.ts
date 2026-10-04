/**
 * Client-side "Remember me" for login form — **email only**.
 * Passwords are never persisted in localStorage (OWASP / XSS mitigation).
 * TTL: 24 hours. Cleared after expiry or when unchecked.
 */

const STORAGE_KEY = "onigiroku.auth.rememberMe.v2";
/** Legacy key that stored passwords — always cleared on load. */
const LEGACY_STORAGE_KEY = "onigiroku.auth.rememberMe.v1";

export const REMEMBER_ME_TTL_MS = 24 * 60 * 60 * 1000;

export type RememberMeCredentials = {
  email: string;
};

type RememberMeRecord = RememberMeCredentials & {
  expiresAt: number;
};

function encode(payload: RememberMeRecord): string {
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
      typeof parsed?.expiresAt !== "number"
    ) {
      return null;
    }
    return { email: parsed.email, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function clearLegacyPasswordRememberMe() {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearRememberMe() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    clearLegacyPasswordRememberMe();
  } catch {
    // ignore quota / private mode
  }
}

export function saveRememberMe(credentials: RememberMeCredentials) {
  if (typeof window === "undefined") return;
  clearLegacyPasswordRememberMe();
  const record: RememberMeRecord = {
    email: credentials.email.trim().toLowerCase(),
    expiresAt: Date.now() + REMEMBER_ME_TTL_MS,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, encode(record));
  } catch {
    // ignore
  }
}

/** Returns remembered email if still valid; otherwise clears storage and returns null. */
export function loadRememberMe(): RememberMeCredentials | null {
  if (typeof window === "undefined") return null;
  clearLegacyPasswordRememberMe();
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
    return { email: record.email };
  } catch {
    clearRememberMe();
    return null;
  }
}
