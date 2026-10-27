import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-charcoal/10", className)}
      aria-hidden
    />
  );
}

type ShellProps = {
  children: React.ReactNode;
  className?: string;
  label?: string;
};

function LoadingShell({ children, className, label = "Loading" }: ShellProps) {
  return (
    <div
      className={cn("relative w-full", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Compact spinner for inline / dialog pending states. */
export function AdminInlineSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2 py-10", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
      <span className="text-sm font-semibold text-charcoal/55">{label}</span>
    </div>
  );
}

/** Category list / card grid skeleton (handles many items visually). */
export function AdminCategoryBoardSkeleton({
  cards = 6,
  label = "Loading categories",
}: {
  cards?: number;
  label?: string;
}) {
  const count = Math.min(Math.max(cards, 3), 12);
  return (
    <LoadingShell label={label} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-10 w-40 rounded-xl" />
        <Bone className="h-11 w-full max-w-xs rounded-2xl sm:w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-charcoal/10 bg-[var(--workspace-card,#f7f2ea)]"
          >
            <Bone className="aspect-[16/9] rounded-none" />
            <div className="space-y-2 p-4">
              <Bone className="h-5 w-3/4 rounded-lg" />
              <Bone className="h-4 w-full rounded-lg" />
              <Bone className="h-4 w-2/3 rounded-lg" />
              <Bone className="mt-3 h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}

/** Edit-category layout skeleton (form + lessons column). */
export function AdminCategoryEditorSkeleton({
  label = "Loading category",
}: {
  label?: string;
}) {
  return (
    <LoadingShell
      label={label}
      className="mx-auto w-full max-w-[96rem] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
    >
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
        <section className="min-w-0 space-y-5 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-3 shadow-sm sm:p-6">
          <Bone className="h-10 w-36 rounded-xl" />
          <Bone className="h-8 w-48 rounded-xl" />
          <Bone className="h-4 w-full max-w-md rounded-lg" />
          <Bone className="h-11 w-56 rounded-2xl" />
          <Bone className="h-12 w-full rounded-2xl" />
          <Bone className="h-40 w-full rounded-2xl" />
          <div className="flex flex-col gap-4 sm:flex-row">
            <Bone className="aspect-[2/1] w-full rounded-xl sm:w-52" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-4 w-20 rounded-lg" />
              <Bone className="h-11 w-40 rounded-2xl" />
              <Bone className="h-3 w-full max-w-xs rounded-lg" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Bone className="h-12 w-full rounded-2xl" />
            <Bone className="h-20 w-full rounded-2xl" />
          </div>
          <Bone className="h-11 w-36 rounded-2xl" />
        </section>
        <aside className="min-w-0 space-y-3 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-3 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <Bone className="h-6 w-28 rounded-lg" />
            <Bone className="h-10 w-32 rounded-xl" />
          </div>
          <Bone className="h-16 w-full rounded-2xl" />
          {Array.from({ length: 4 }, (_, index) => (
            <Bone key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </aside>
      </div>
    </LoadingShell>
  );
}

/** Lesson / news material editor skeleton. */
export function AdminMaterialEditorSkeleton({
  label = "Loading lesson",
  withAside = true,
}: {
  label?: string;
  withAside?: boolean;
}) {
  return (
    <LoadingShell label={label} className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-workspace-mesh"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[96rem] space-y-5 px-3 py-4 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Bone className="h-9 w-40 rounded-xl" />
            <Bone className="h-4 w-28 rounded-lg" />
            <Bone className="h-9 w-56 rounded-xl" />
          </div>
          <Bone className="h-11 w-36 rounded-2xl" />
        </div>
        <div
          className={cn(
            "grid items-start gap-5",
            withAside && "xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]",
          )}
        >
          <div className="min-w-0 space-y-5">
            <Bone className="h-11 w-56 rounded-2xl" />
            <section className="space-y-4 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-3 sm:p-6">
              <Bone className="h-12 w-full rounded-2xl" />
              <Bone className="h-4 w-40 rounded-lg" />
              <Bone className="h-48 w-full rounded-2xl sm:h-56" />
            </section>
            <section className="space-y-3 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-card)] p-3 sm:p-6">
              <Bone className="h-12 w-40 rounded-2xl" />
              <Bone className="h-20 w-full rounded-2xl" />
              <Bone className="h-28 w-full rounded-2xl" />
            </section>
          </div>
          {withAside ? (
            <aside className="min-w-0 space-y-4">
              <div className="space-y-3 rounded-[1.35rem] border border-charcoal/10 bg-[var(--workspace-elevated,#efe8de)] p-4 sm:p-5">
                <Bone className="h-4 w-20 rounded-lg" />
                <Bone className="aspect-video w-full rounded-2xl" />
                <Bone className="h-10 w-full rounded-xl" />
                <Bone className="h-12 w-full rounded-2xl" />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </LoadingShell>
  );
}
