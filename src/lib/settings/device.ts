/**
 * Lightweight user-agent / device labeling for login history UI.
 * Not a full UA parser — stable, dependency-free, good enough for security awareness.
 */

export type DeviceSummary = {
  label: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
};

export function summarizeUserAgent(userAgent: string | null | undefined): DeviceSummary {
  const ua = (userAgent ?? "").trim();
  if (!ua) {
    return {
      label: "Unknown device",
      browser: "Unknown",
      os: "Unknown",
      deviceType: "unknown",
    };
  }

  const deviceType: DeviceSummary["deviceType"] = /ipad|tablet/i.test(ua)
    ? "tablet"
    : /mobi|iphone|android(?!.*tablet)/i.test(ua)
      ? "mobile"
      : "desktop";

  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";

  let os = "Unknown OS";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  const deviceWord =
    deviceType === "mobile"
      ? "Mobile"
      : deviceType === "tablet"
        ? "Tablet"
        : "Desktop";

  return {
    label: `${browser} on ${os} (${deviceWord})`,
    browser,
    os,
    deviceType,
  };
}

/** @deprecated Prefer `@/lib/storage` — kept for existing imports. */
export { extractOwnedObjectKey } from "@/lib/storage/public-url";
