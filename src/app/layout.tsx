import type { ReactNode } from "react";

/**
 * Root layout required by Next.js. Locale-specific html/body live in [locale]/layout.
 * @see https://next-intl.dev/docs/getting-started/app-router
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
