import { cn } from "../../lib/cn";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/** Hairline separator. Decorative — hidden from the accessibility tree. */
export function Divider({ orientation = "horizontal", className }: DividerProps) {
  return (
    <hr
      aria-hidden="true"
      className={cn(
        "border-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
