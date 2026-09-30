import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/layout/site-header";

type Props = {
  children: React.ReactNode;
  /** Narrower card for short forms */
  maxWidthClassName?: string;
};

/**
 * Shared chrome for auth screens — matches landing brand (header, washi mesh, footer).
 */
export function AuthShell({
  children,
  maxWidthClassName = "max-w-md",
}: Props) {
  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-hero-mesh px-4 py-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-seigaiha opacity-50"
          aria-hidden
        />
        <div
          className={`relative w-full ${maxWidthClassName} rounded-2xl border border-charcoal/10 bg-white/95 p-5 shadow-[0_20px_48px_-36px_rgba(67,64,64,0.45)] backdrop-blur-sm sm:p-8`}
        >
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
