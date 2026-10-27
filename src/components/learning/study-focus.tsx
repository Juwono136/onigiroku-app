"use client";

import { useEffect } from "react";

import { useSidebar } from "@/components/app-shell/sidebar-context";

/** Collapse the dashboard sidebar while a student is inside a learning path. */
export function StudyFocus() {
  const { setFocusMode } = useSidebar();

  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [setFocusMode]);

  return null;
}
