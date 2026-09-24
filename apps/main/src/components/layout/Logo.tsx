import { cn } from "../../lib/cn";

/**
 * CYVANTAS brand logo. The horizontal wordmark is designed for the dark site,
 * so it is rendered as-is with no color/filter transforms. When `responsive`
 * is set, the compact square emblem is shown on narrow viewports and the full
 * horizontal logo on `sm`+ — both scaled by height with width auto to avoid
 * distortion.
 */
export function Logo({
  className,
  responsive = false,
}: {
  className?: string;
  responsive?: boolean;
}) {
  if (responsive) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <img
          src="/cyvantas-icon-master.png"
          alt="CYVANTAS"
          width={1536}
          height={1536}
          className="h-8 w-8 sm:hidden"
        />
        <img
          src="/cyvantas-logo-light.png"
          alt="CYVANTAS"
          width={1200}
          height={284}
          className="hidden h-8 w-auto sm:block"
        />
      </span>
    );
  }

  return (
    <img
      src="/cyvantas-logo-light.png"
      alt="CYVANTAS"
      width={1200}
      height={284}
      className={cn("h-8 w-auto", className)}
    />
  );
}
