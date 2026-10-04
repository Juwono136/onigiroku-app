/**
 * Next.js server boot hook — validate env before serving traffic.
 * Production misconfig (weak secrets, localhost storage, etc.) fails closed.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/lib/env");
    getServerEnv();
  }
}
