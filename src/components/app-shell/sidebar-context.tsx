"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "onigiroku.app.sidebarCollapsed";

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

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === "1") setCollapsedState(true);
      } catch {
        // ignore
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    if (focusMode) {
      setFocusMode(false);
      setCollapsed(false);
      return;
    }
    setCollapsed(!collapsed);
  }, [collapsed, focusMode, setCollapsed]);

  const value = useMemo(
    () => ({
      collapsed: focusMode || (hydrated ? collapsed : false),
      mobileOpen,
      setCollapsed,
      setFocusMode,
      toggleCollapsed,
      setMobileOpen,
      toggleMobileOpen: () => setMobileOpen((v) => !v),
    }),
    [collapsed, focusMode, hydrated, mobileOpen, setCollapsed, toggleCollapsed],
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
