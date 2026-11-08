"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { UserRole } from "@/lib/auth/roles";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/app-shell/sidebar-preference";

type SidebarContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (value: boolean) => void;
  setFocusMode: (value: boolean) => void;
  toggleCollapsed: () => void;
  setMobileOpen: (value: boolean) => void;
  toggleMobileOpen: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  /** Student dashboards default collapsed for a wider workspace. */
  role: UserRole;
};

export function SidebarProvider({ children, role }: ProviderProps) {
  const defaultCollapsed = role === "USER";
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);
  const [focusMode, setFocusModeState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // USER: session-only preference (empty → collapsed). ADMIN: localStorage.
      const next = readSidebarCollapsed(role, defaultCollapsed);
      setCollapsedState(next);
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [defaultCollapsed, role]);

  const setCollapsed = useCallback(
    (value: boolean) => {
      setCollapsedState(value);
      writeSidebarCollapsed(role, value);
    },
    [role],
  );

  const setFocusMode = useCallback(
    (value: boolean) => {
      setFocusModeState(value);
      if (!value) {
        // Leaving a path page: restore the student's real preference (default collapsed).
        setCollapsedState(readSidebarCollapsed(role, defaultCollapsed));
      }
    },
    [defaultCollapsed, role],
  );

  const toggleCollapsed = useCallback(() => {
    if (focusMode) {
      // Exit study focus without forcing an expanded sidebar.
      setFocusMode(false);
      return;
    }
    setCollapsed(!collapsed);
  }, [collapsed, focusMode, setCollapsed, setFocusMode]);

  const value = useMemo(
    () => ({
      // Students render collapsed before hydration to avoid an expand flash.
      collapsed: focusMode || (hydrated ? collapsed : defaultCollapsed),
      mobileOpen,
      setCollapsed,
      setFocusMode,
      toggleCollapsed,
      setMobileOpen,
      toggleMobileOpen: () => setMobileOpen((v) => !v),
    }),
    [
      collapsed,
      defaultCollapsed,
      focusMode,
      hydrated,
      mobileOpen,
      setCollapsed,
      setFocusMode,
      toggleCollapsed,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
