import type { ElementType, HTMLAttributes } from "react";
import { Container } from "./Container";
import { cn } from "../../lib/cn";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** Extra classes for the inner Container. */
  containerClassName?: string;
  /** Apply vertical section padding. Default true. */
  pad?: boolean;
}

/**
 * Page section wrapper: full-width element (so backgrounds/borders can bleed)
 * with a centered Container inside. `scroll-mt` offsets in-page anchor jumps
 * for the sticky header.
 */
export function Section({
  as: Tag = "section",
  className,
  containerClassName,
  pad = true,
  children,
  ...props
}: SectionProps) {
  return (
    <Tag
      className={cn(
        "scroll-mt-[var(--header-height)]",
        pad && "py-[var(--section-pad)]",
        className,
      )}
      {...props}
    >
      <Container className={containerClassName}>{children}</Container>
    </Tag>
  );
}
