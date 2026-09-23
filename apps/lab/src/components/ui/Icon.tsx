import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Size = "sm" | "md" | "lg";

interface IconProps {
  children: ReactNode;
  size?: Size;
  /** Accessible label. When omitted the icon is treated as decorative. */
  label?: string;
  /** Renders a bordered surface tile around the icon. */
  boxed?: boolean;
  className?: string;
}

const sizes: Record<Size, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

const boxes: Record<Size, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

/**
 * Sizing / theming wrapper for inline SVG icons. Enforces consistent icon
 * sizing tokens and correct a11y semantics (decorative vs. labelled).
 */
export function Icon({ children, size = "md", label, boxed = false, className }: IconProps) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  const glyph = (
    <span
      {...a11y}
      className={cn(
        "inline-flex items-center justify-center text-accent [&>svg]:h-full [&>svg]:w-full",
        sizes[size],
        !boxed && className,
      )}
    >
      {children}
    </span>
  );

  if (!boxed) return glyph;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-surface-elevated",
        boxes[size],
        className,
      )}
    >
      <span
        {...a11y}
        className={cn("inline-flex items-center justify-center text-accent [&>svg]:h-full [&>svg]:w-full", sizes[size])}
      >
        {children}
      </span>
    </span>
  );
}
