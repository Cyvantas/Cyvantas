import type { ElementType, HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

/** Centered page container: max-width 1200px with fluid gutters. */
export function Container({ as: Tag = "div", className, ...props }: ContainerProps) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-[var(--container-page)] px-[var(--gutter)]", className)}
      {...props}
    />
  );
}
