import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone =
  | "neutral"
  | "cyan"
  | "green"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "border-border text-muted",
  cyan: "border-accent-line text-accent bg-accent-soft",
  green: "border-accent-secondary/40 text-accent-secondary bg-accent-secondary-soft",
  // Severity tones pair color with text (never color alone).
  critical: "border-danger/40 text-danger bg-danger/10",
  high: "border-danger/40 text-danger bg-danger/10",
  medium: "border-warning/40 text-warning bg-warning/10",
  low: "border-accent-secondary/40 text-accent-secondary bg-accent-secondary-soft",
  info: "border-accent-line text-accent bg-accent-soft",
};

/** Mono, uppercase chip. Use `tone` for category / severity semantics. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5",
        "font-mono text-[0.6875rem] uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
