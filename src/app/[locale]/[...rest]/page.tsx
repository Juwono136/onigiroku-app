import { notFound } from "next/navigation";

/**
 * Catch-all under a locale: unknown paths show the branded 404
 * instead of leaking framework defaults.
 */
export default function LocaleCatchAll() {
  notFound();
}

