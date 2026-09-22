import { cn } from "../../lib/cn";

interface BackgroundProps {
  grid?: boolean;
  glow?: boolean;
  noise?: boolean;
  className?: string;
}

// Low-opacity noise via inline SVG feTurbulence (no network request).
const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Fixed, decorative background system: fine technical grid, controlled radial
 * glow, and optional subtle noise. Entirely presentational and hidden from the
 * accessibility tree; sits behind all content.
 */
export function Background({ grid = true, glow = true, noise = true, className }: BackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-[var(--z-behind)] overflow-hidden", className)}
    >
      {grid ? (
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px)," +
              "linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 100% 70% at 50% 0%, #000 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 100% 70% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />
      ) : null}

      {glow ? (
        <div
          className="absolute inset-x-0 top-0 h-[60vh]"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 0%, var(--color-accent-soft) 0%, transparent 70%)",
          }}
        />
      ) : null}

      {noise ? (
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-soft-light"
          style={{ backgroundImage: NOISE_DATA_URI }}
        />
      ) : null}
    </div>
  );
}
