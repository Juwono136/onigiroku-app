/**
 * Human-friendly IP labels for login history (local / private / public).
 * Keeps the raw value available for tooltips without overwhelming casual users.
 */

export type IpDisplayKind = "local" | "private" | "public" | "unknown";

export type IpDisplay = {
  raw: string | null;
  /** Short label shown in the UI */
  label: string;
  /** Optional full technical value for title/tooltip */
  detail: string | null;
  kind: IpDisplayKind;
};

function isAllZeroIPv6(ip: string): boolean {
  const parts = ip.split(":");
  return parts.length > 0 && parts.every((p) => p === "" || /^0+$/.test(p));
}

function compressIPv6(ip: string): string {
  try {
    // Collapse longest zero run for readability (best-effort, not a full RFC parser).
    const lowered = ip.toLowerCase();
    if (lowered.includes(".")) return lowered; // v4-mapped — leave as-is
    const segments = lowered.split(":");
    if (segments.length < 3) return lowered;

    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === "0" || segments[i] === "") {
        if (curStart === -1) curStart = i;
        curLen++;
      } else {
        if (curLen > bestLen) {
          bestStart = curStart;
          bestLen = curLen;
        }
        curStart = -1;
        curLen = 0;
      }
    }
    if (curLen > bestLen) {
      bestStart = curStart;
      bestLen = curLen;
    }
    if (bestLen < 2 || bestStart < 0) {
      return segments.map((s) => s.replace(/^0+(?=\w)/, "") || "0").join(":");
    }
    const left = segments
      .slice(0, bestStart)
      .map((s) => s.replace(/^0+(?=\w)/, "") || "0")
      .join(":");
    const right = segments
      .slice(bestStart + bestLen)
      .map((s) => s.replace(/^0+(?=\w)/, "") || "0")
      .join(":");
    return `${left}::${right}`.replace(/^:::/, "::").replace(/:::$/, "::");
  } catch {
    return ip;
  }
}

function isPrivateIPv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fe80::")
  );
}

/**
 * Map a stored session IP into a user-friendly display object.
 * Labels are English keys consumed by i18n on the client.
 */
export function describeIpAddress(ipAddress: string | null | undefined): IpDisplay {
  const raw = (ipAddress ?? "").trim();
  if (!raw) {
    return { raw: null, label: "unknown", detail: null, kind: "unknown" };
  }

  const normalized = raw.replace(/^\[|\]$/g, "");

  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized === "0000:0000:0000:0000:0000:0000:0000:0001" ||
    isAllZeroIPv6(normalized) ||
    normalized === "0.0.0.0"
  ) {
    return {
      raw: normalized,
      label: "local",
      detail: compressIPv6(normalized) === normalized
        ? normalized
        : compressIPv6(normalized),
      kind: "local",
    };
  }

  if (isPrivateIPv4(normalized) || isPrivateIPv6(normalized)) {
    const compact = normalized.includes(":")
      ? compressIPv6(normalized)
      : normalized;
    return {
      raw: normalized,
      label: "private",
      detail: compact,
      kind: "private",
    };
  }

  const compact = normalized.includes(":")
    ? compressIPv6(normalized)
    : normalized;

  return {
    raw: normalized,
    label: compact,
    detail: compact !== normalized ? normalized : null,
    kind: "public",
  };
}
