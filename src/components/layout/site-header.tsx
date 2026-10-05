"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { LogoutConfirmDialog } from "@/components/auth/logout-confirm-dialog";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { UserMenu, UserMenuSkeleton } from "@/components/layout/user-menu";
import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { useSession } from "@/lib/auth/client";
import {
  getDashboardPath,
  normalizeRole,
  ROLE_LABELS,
} from "@/lib/auth/roles";
import { toBrowserMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAV_KEYS = ["features", "howItWorks", "news", "pricing", "faq"] as const;

const NAV_HREFS = {
  features: "/#features",
  howItWorks: "/#how-it-works",
  news: "/news",
  pricing: "/#pricing",
  faq: "/#faq",
} as const;

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const panelId = useId();
  const canUsePortal = typeof document !== "undefined";

  const isAppArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings");

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Soft scroll lock: keep scroll position (no position:fixed + scrollTo).
    // Full-viewport portal menu already covers interaction; restoring scroll
    // with html.scroll-smooth was causing a top→bottom jump on close.
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      bodyPaddingRight: body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.touchAction = previous.bodyTouchAction;
      body.style.paddingRight = previous.bodyPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", closeOnDesktop);
    return () => mq.removeEventListener("change", closeOnDesktop);
  }, []);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: toBrowserMediaUrl(session.user.image),
        role: (session.user as { role?: string | null }).role,
      }
    : null;

  const role = user ? normalizeRole(user.role) : null;
  const roleLabel =
    role && (locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id);
  const dashboardHref = role ? getDashboardPath(role) : "/dashboard";
  const avatarSrc = user?.image ? toBrowserMediaUrl(user.image) : null;

  const mobileMenu = canUsePortal
    ? createPortal(
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="mobile-nav"
              className="fixed inset-0 z-[200] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button
                type="button"
                aria-label={t("closeMenu")}
                className="absolute inset-0 cursor-pointer bg-ink/40"
                onClick={() => setOpen(false)}
              />

              <motion.div
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col bg-white shadow-[0_28px_56px_-24px_rgba(24,24,27,0.45)]"
                initial={{ y: -16, opacity: 0.96 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 sm:h-16 sm:px-6">
                  <div onClick={() => setOpen(false)} className="min-w-0">
                    <BrandWordmark
                      href={user ? dashboardHref : "/"}
                      size={36}
                      className="min-w-0 gap-2"
                      logoClassName="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
                      textClassName="truncate text-base sm:text-lg"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LocaleSwitcher />
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "icon" }),
                        "cursor-pointer rounded-xl",
                      )}
                      aria-label={t("closeMenu")}
                      onClick={() => setOpen(false)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                  {user ? (
                    <div className="mb-3 flex items-center gap-3 rounded-xl border border-charcoal/10 bg-soft/60 px-3 py-3">
                      <Avatar className="size-12 shrink-0 border border-charcoal/10 shadow-sm">
                        {avatarSrc ? (
                          <AvatarImage
                            key={avatarSrc}
                            src={avatarSrc}
                            alt={user.name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-brand/10 font-semibold text-brand">
                          {userInitials(user.name) || (
                            <UserRound className="size-5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-charcoal/60">
                          {user.email}
                        </p>
                        {roleLabel ? (
                          <span className="mt-1.5 inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                            {roleLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {!isAppArea
                    ? NAV_KEYS.map((key) => (
                        <Link
                          key={key}
                          href={NAV_HREFS[key]}
                          className="block cursor-pointer rounded-xl px-3 py-3 text-base font-medium text-ink transition-colors hover:bg-soft hover:text-brand"
                          onClick={() => setOpen(false)}
                        >
                          {t(key)}
                        </Link>
                      ))
                    : null}

                  {user ? (
                    <div
                      className={cn(
                        "grid gap-1",
                        !isAppArea && "mt-2 border-t border-border/70 pt-3",
                      )}
                    >
                      <Link
                        href={dashboardHref}
                        onClick={() => setOpen(false)}
                        className="cursor-pointer rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-soft hover:text-brand"
                      >
                        {t("dashboard")}
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="cursor-pointer rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-soft hover:text-brand"
                      >
                        {t("settings")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setLogoutOpen(true);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-3 text-left text-base font-medium text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" aria-hidden />
                        {t("logout")}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-4">
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-11 cursor-pointer rounded-xl font-semibold",
                        )}
                      >
                        {t("login")}
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className={cn(
                          buttonVariants(),
                          "h-11 cursor-pointer rounded-xl font-semibold",
                        )}
                      >
                        {t("register")}
                      </Link>
                    </div>
                  )}
                </nav>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
          <BrandWordmark
            href={user ? dashboardHref : "/"}
            size={36}
            priority
            className="min-w-0 gap-2 sm:gap-2.5"
            logoClassName="h-8 w-8 shrink-0 sm:h-9 sm:w-9 transition-transform duration-300 group-hover:scale-105"
            textClassName="truncate text-base sm:text-lg"
          />

          {!isAppArea ? (
            <nav
              className="hidden items-center gap-8 md:flex"
              aria-label="Primary"
            >
              {NAV_KEYS.map((key) => (
                <Link
                  key={key}
                  href={NAV_HREFS[key]}
                  className="cursor-pointer text-sm font-medium text-charcoal/80 transition-colors hover:text-brand"
                >
                  {t(key)}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="hidden items-center gap-6 md:flex" aria-label="App">
              <Link
                href={dashboardHref}
                className={cn(
                  "cursor-pointer text-sm font-semibold transition-colors",
                  pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/admin")
                    ? "text-brand"
                    : "text-charcoal/80 hover:text-brand",
                )}
              >
                {t("dashboard")}
              </Link>
              <Link
                href="/settings"
                className={cn(
                  "cursor-pointer text-sm font-semibold transition-colors",
                  pathname.startsWith("/settings")
                    ? "text-brand"
                    : "text-charcoal/80 hover:text-brand",
                )}
              >
                {t("settings")}
              </Link>
            </nav>
          )}

          <div className="hidden items-center gap-3 md:flex">
            <LocaleSwitcher />
            {isPending ? (
              <UserMenuSkeleton />
            ) : user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "cursor-pointer font-semibold",
                  )}
                >
                  {t("login")}
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "cursor-pointer rounded-xl font-semibold shadow-sm",
                  )}
                >
                  {t("register")}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LocaleSwitcher />
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "cursor-pointer rounded-xl",
              )}
              aria-label={t("openMenu")}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenu}

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}
