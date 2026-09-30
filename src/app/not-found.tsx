import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "./globals.css";

/**
 * Root-level 404 when a request never enters a locale layout
 * (self-contained html/body because root layout is a passthrough).
 */
export default function RootNotFound() {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full flex flex-col bg-canvas font-sans text-foreground antialiased">
        <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 sm:py-24">
          <div
            className="pointer-events-none absolute inset-0 bg-seigaiha opacity-40"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-md text-center">
            <p className="font-jp text-5xl font-bold tracking-tight text-brand/90 sm:text-6xl">
              404
            </p>
            <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Halaman tidak ditemukan
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-charcoal/75 sm:text-base">
              URL yang Anda buka bukan bagian dari Onigiroku. Mungkin sudah
              dipindah, dihapus, atau salah ketik.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 w-full cursor-pointer rounded-xl px-6 font-semibold sm:w-auto",
                )}
              >
                Kembali ke beranda
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold text-charcoal/80 transition-colors hover:text-brand sm:w-auto"
              >
                Masuk
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
