"use client";

import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Home,
  Laptop,
  Loader2,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Wifi,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import type { LoginHistoryItem, LoginHistoryPage } from "@/lib/settings/login-history";
import { cn } from "@/lib/utils";

type Props = {
  /** Side-column layout: vertical session list instead of multi-column cards */
  compact?: boolean;
};

function DeviceIcon({ type }: { type: LoginHistoryItem["deviceType"] }) {
  if (type === "mobile") return <Smartphone className="size-4" aria-hidden />;
  if (type === "tablet") return <Tablet className="size-4" aria-hidden />;
  if (type === "desktop") return <Laptop className="size-4" aria-hidden />;
  return <MonitorSmartphone className="size-4" aria-hidden />;
}

function NetworkIcon({ kind }: { kind: LoginHistoryItem["ipKind"] }) {
  if (kind === "local") return <Home className="size-3.5" aria-hidden />;
  if (kind === "private") return <Wifi className="size-3.5" aria-hidden />;
  return <Globe2 className="size-3.5" aria-hidden />;
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatRelative(iso: string, locale: string) {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "id", {
      numeric: "auto",
    });
    if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) return rtf.format(-hours, "hour");
    const days = Math.round(hours / 24);
    return rtf.format(-days, "day");
  } catch {
    return formatWhen(iso, locale);
  }
}

function resolveIpLabel(
  item: LoginHistoryItem,
  labels: { local: string; private: string; unknown: string },
) {
  if (item.ipKind === "local") return labels.local;
  if (item.ipKind === "private") return labels.private;
  if (item.ipKind === "unknown" || !item.ipLabel) return labels.unknown;
  return item.ipLabel;
}

export function LoginHistoryPanel({ compact = false }: Props) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LoginHistoryPage | null>(null);
  const [pending, startTransition] = useTransition();
  const [initialLoading, setInitialLoading] = useState(true);
  const pageSize = compact ? 6 : 8;

  const load = useCallback(
    (nextPage: number) => {
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/settings/login-history?page=${nextPage}&pageSize=${pageSize}`,
            { cache: "no-store" },
          );
          const payload = (await res.json()) as {
            success?: boolean;
            data?: LoginHistoryPage;
          };
          if (!res.ok || !payload.success || !payload.data) {
            toast.error(t("errors.HISTORY_FAILED"));
            return;
          }
          setData(payload.data);
          setPage(payload.data.page);
        } catch {
          toast.error(t("errors.HISTORY_FAILED"));
        } finally {
          setInitialLoading(false);
        }
      });
    },
    [pageSize, t],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => load(1));
    return () => cancelAnimationFrame(frame);
  }, [load]);

  return (
    <section
      className={cn(
        "jp-rail rounded-2xl border border-charcoal/10 bg-[var(--workspace-card)] p-5 shadow-[0_14px_36px_-30px_rgba(67,64,64,0.5)] sm:p-6",
        compact && "lg:max-h-[calc(100svh-6.5rem)] lg:overflow-hidden lg:flex lg:flex-col",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">{t("history.title")}</h2>
          <p className="mt-1 text-sm text-charcoal/65">{t("history.subtitle")}</p>
        </div>
        <span className="inline-flex rounded-full bg-soft px-2.5 py-1 text-[11px] font-semibold text-charcoal/60">
          {t("history.windowBadge")}
        </span>
      </div>

      {initialLoading && !data ? (
        <div className="mt-6">
          <LoadingSpinner label={t("history.loading")} />
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-charcoal/15 bg-[var(--workspace-elevated)] px-4 py-8 text-center text-sm text-charcoal/60">
          {t("history.empty")}
        </p>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <ul
            className={cn(
              "mt-5 gap-3",
              compact
                ? "flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5"
                : "grid sm:grid-cols-2 xl:grid-cols-4",
            )}
          >
            {data.items.map((item) => {
              const ipLabel = resolveIpLabel(item, {
                local: t("history.ipLocal"),
                private: t("history.ipPrivate"),
                unknown: t("history.unknownIp"),
              });
              const ipTitle =
                item.ipDetail ||
                (item.ipKind === "public" ? item.ipLabel : item.ipAddress) ||
                undefined;
              const deviceKind =
                item.deviceType === "mobile"
                  ? t("history.deviceMobile")
                  : item.deviceType === "tablet"
                    ? t("history.deviceTablet")
                    : item.deviceType === "desktop"
                      ? t("history.deviceDesktop")
                      : t("history.deviceUnknown");

              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border bg-[var(--workspace-elevated)] p-3.5 transition-colors",
                    compact ? "flex items-start gap-3" : "flex flex-col p-4",
                    item.isCurrent
                      ? "border-brand/35 shadow-[0_10px_24px_-22px_rgba(230,0,18,0.55)]"
                      : "border-charcoal/10 hover:border-charcoal/20",
                  )}
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
                    <DeviceIcon type={item.deviceType} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {item.browser}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-charcoal/55">
                          {item.os} · {deviceKind}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.isCurrent ? (
                          <span className="inline-flex rounded-full bg-brand/12 px-2 py-0.5 text-[11px] font-semibold text-brand">
                            {t("history.current")}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            item.isActive
                              ? "bg-success/10 text-success"
                              : "bg-charcoal/10 text-charcoal/55",
                          )}
                        >
                          {item.isActive
                            ? t("history.active")
                            : t("history.expired")}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm font-medium text-ink">
                      {formatRelative(item.createdAt, locale)}
                      <span className="ml-1.5 text-[11px] font-normal text-charcoal/45">
                        · {formatWhen(item.createdAt, locale)}
                      </span>
                    </p>

                    <div
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-charcoal/65"
                      title={ipTitle}
                    >
                      <span className="inline-flex size-5 items-center justify-center rounded-md bg-white/70 text-charcoal/55">
                        <NetworkIcon kind={item.ipKind} />
                      </span>
                      <span className="min-w-0 truncate font-medium">
                        {ipLabel}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 pt-4">
            <p className="text-xs text-charcoal/55">
              {t("history.pageInfo", {
                page: data.page,
                totalPages: data.totalPages,
                total: data.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || data.page <= 1}
                className="h-9 cursor-pointer gap-1 rounded-xl"
                onClick={() => load(page - 1)}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronLeft className="size-3.5" />
                )}
                {t("history.prev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || data.page >= data.totalPages}
                className="h-9 cursor-pointer gap-1 rounded-xl"
                onClick={() => load(page + 1)}
              >
                {t("history.next")}
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
