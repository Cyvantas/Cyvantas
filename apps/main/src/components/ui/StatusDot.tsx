import { cn } from "../../lib/cn";

type Status = "online" | "active" | "warning" | "danger" | "idle";

interface StatusDotProps {
  status?: Status;
  /** Adds a pulsing ping. Disabled automatically under prefers-reduced-motion. */
  pulse?: boolean;
  label?: string;
  className?: string;
}

const colors: Record<Status, string> = {
  online: "bg-accent-secondary",
  active: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  idle: "bg-dim",
};

/**
 * Small status indicator. When `label` is provided it renders inline text so
 * meaning never relies on color alone.
 */
export function StatusDot({ status = "idle", pulse = false, label, className }: StatusDotProps) {
  const dot = (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60",
            "motion-safe:animate-ping",
            colors[status],
          )}
        />
      ) : null}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", colors[status])} />
    </span>
  );

  if (!label) {
    return <span className={cn("inline-flex", className)}>{dot}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {dot}
      <span className="text-technical text-muted">{label}</span>
    </span>
  );
}
