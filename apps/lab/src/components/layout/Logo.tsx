import { cn } from "../../lib/cn";

/** Official main-site wordmark, with a compact Security Lab sublabel. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 flex-col gap-1 leading-none", className)}>
      <img
        src="/cyvantas-logo-light.png"
        alt="CYVANTAS"
        width={1200}
        height={284}
        className="block h-auto w-32 sm:w-36 lg:w-32"
        decoding="async"
      />
      <span className="text-technical self-end text-[10px] leading-3 tracking-[0.16em] text-muted">
        SECURITY LAB
      </span>
    </span>
  );
}
