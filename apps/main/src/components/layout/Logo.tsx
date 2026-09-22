import { cn } from "../../lib/cn";

/** CYVANTAS hexagon mark + wordmark with "Offensive Intelligence" sublabel. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-7 shrink-0"
        role="img"
        aria-label="CYVANTAS"
        fill="none"
      >
        <path
          d="M16 2 28 9v14L16 30 4 23V9L16 2Z"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m11 12 5 8 5-8"
          stroke="var(--color-foreground)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-base font-semibold tracking-wide text-foreground">
          CYVANTAS
        </span>
        <span className="text-technical text-dim">Offensive Intelligence</span>
      </span>
    </span>
  );
}
