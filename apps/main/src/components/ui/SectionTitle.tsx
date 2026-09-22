import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Mono eyebrow label with a `//` prefix (brand convention). */
export function Eyebrow({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-technical text-accent", className)}
      {...props}
    >
      <span aria-hidden="true">// </span>
      {children}
    </span>
  );
}

interface SectionTitleProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Heading level for correct document outline. Defaults to h2. */
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  className?: string;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  align = "left",
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading className="text-heading text-foreground text-balance">{title}</Heading>
      {description ? (
        <p className="text-body max-w-[60ch] text-muted">{description}</p>
      ) : null}
    </div>
  );
}
