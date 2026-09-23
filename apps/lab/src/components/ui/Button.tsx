import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-[color,background-color,border-color,box-shadow] duration-200 " +
  "cursor-pointer select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-background hover:bg-accent/90",
  secondary:
    "bg-surface-elevated text-foreground border border-border hover:border-accent-line",
  ghost:
    "bg-transparent text-foreground border border-border hover:border-accent hover:text-accent",
};

// md meets the 44px touch target; sm is for dense desktop contexts.
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
