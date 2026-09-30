"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { Toaster } from "@/components/ui/sonner";

/**
 * App-wide client providers.
 * Theme is fixed to light (brand surfaces). Avoid next-themes ThemeProvider —
 * its injected <script> triggers a React 19 / Next 16 console error on client
 * navigations (e.g. locale switch).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-center" closeButton theme="light" />
    </QueryClientProvider>
  );
}
