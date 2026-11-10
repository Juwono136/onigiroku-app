import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Decorative JP mark (visual only). */
  mark?: string;
  className?: string;
};

/** Compact catalog masthead — paths are the hero, not the page title. */
export function PathCatalogHeader({
  eyebrow,
  title,
  subtitle,
  mark = "学",
  className,
}: Props) {
  return (
    <header
      className={cn(
        "mb-5 flex items-start gap-3 sm:mb-6",
        className,
      )}
    >
      <span
        className="font-jp mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-brand text-[1.15rem] font-bold text-white shadow-[0_10px_22px_-12px_rgba(230,0,18,0.7)] sm:size-11 sm:text-xl"
        aria-hidden
      >
        {mark}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
          {eyebrow}
        </p>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        <p className="max-w-xl text-sm leading-snug text-charcoal/55">
          {subtitle}
        </p>
      </div>
    </header>
  );
}
