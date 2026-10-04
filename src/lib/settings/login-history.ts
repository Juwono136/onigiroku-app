import { and, count, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { session } from "@/lib/db/schema";
import { summarizeUserAgent } from "@/lib/settings/device";
import {
  describeIpAddress,
  type IpDisplayKind,
} from "@/lib/settings/ip-display";

const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function getLoginHistoryPage(input: {
  userId: string;
  currentSessionToken?: string | null;
  page: number;
  pageSize: number;
}): Promise<LoginHistoryPage> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(50, Math.max(5, input.pageSize));
  const since = new Date(Date.now() - HISTORY_WINDOW_MS);
  const db = getDb();

  const whereClause = and(
    eq(session.userId, input.userId),
    gte(session.createdAt, since),
  );

  const [totalRow] = await db
    .select({ value: count() })
    .from(session)
    .where(whereClause);

  const total = Number(totalRow?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: session.id,
      token: session.token,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    })
    .from(session)
    .where(whereClause)
    .orderBy(desc(session.createdAt))
    .limit(pageSize)
    .offset(offset);

  const now = Date.now();
  const items: LoginHistoryItem[] = rows.map((row) => {
    const summary = summarizeUserAgent(row.userAgent);
    const ip = describeIpAddress(row.ipAddress);
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      ipAddress: row.ipAddress,
      ipLabel: ip.label,
      ipDetail: ip.detail,
      ipKind: ip.kind,
      userAgent: row.userAgent,
      deviceLabel: summary.label,
      browser: summary.browser,
      os: summary.os,
      deviceType: summary.deviceType,
      isCurrent: Boolean(
        input.currentSessionToken && row.token === input.currentSessionToken,
      ),
      isActive: row.expiresAt.getTime() > now,
    };
  });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    windowDays: 7,
  };
}
