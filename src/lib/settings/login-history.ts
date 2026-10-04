/**
 * Login history types. Domain query runs in Go (`/api/settings/login-history`).
 * Presentation helpers for device/IP remain available for any client-side needs.
 */

import type { IpDisplayKind } from "@/lib/settings/ip-display";

export type LoginHistoryItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  /** Friendly IP label key or compacted public IP */
  ipLabel: string;
  ipDetail: string | null;
  ipKind: IpDisplayKind;
  userAgent: string | null;
  deviceLabel: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  isCurrent: boolean;
  isActive: boolean;
};

export type LoginHistoryPage = {
  items: LoginHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  windowDays: 7;
};
