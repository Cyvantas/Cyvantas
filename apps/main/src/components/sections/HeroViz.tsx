/**
 * Decorative radial attack-surface model for the hero. Recreated from the
 * Blogger theme's illustrative SVG using design tokens. Labelled for screen
 * readers; the animated flow lines are gated by prefers-reduced-motion via
 * the global CSS in index.css.
 */
const NODES = [
  { label: "WEB", x: 220, y: 58, anchor: "middle" as const, dx: 0, dy: -14, entry: false },
  { label: "API", x: 352, y: 112, anchor: "start" as const, dx: 16, dy: 4, entry: false },
  { label: "CLOUD", x: 384, y: 244, anchor: "start" as const, dx: 16, dy: 4, entry: false },
  { label: "NETWORK", x: 296, y: 346, anchor: "start" as const, dx: 16, dy: 4, entry: false },
  { label: "MOBILE", x: 144, y: 346, anchor: "end" as const, dx: -16, dy: 4, entry: false },
  { label: "IDENTITY", x: 56, y: 244, anchor: "end" as const, dx: -16, dy: 4, entry: true },
  { label: "OSINT", x: 88, y: 112, anchor: "end" as const, dx: -16, dy: 4, entry: false },
];

// Which spokes render as "active" cyan flow lines (vs. neutral cross-links).
const FLOW = [1, 2, 5];

export function HeroViz() {
  return (
    <figure className="m-0 rounded-lg border border-border bg-surface/60 p-4 backdrop-blur-sm">
      <figcaption className="mb-2 flex items-center justify-between">
        <span className="text-technical text-muted">Attack-surface model</span>
        <span className="text-technical text-dim">Illustrative</span>
      </figcaption>

      <svg
        viewBox="-40 0 520 400"
        role="img"
        aria-labelledby="hero-viz-title"
        className="h-auto w-full"
      >
        <title id="hero-viz-title">
          Illustrative model of an organization&rsquo;s attack surface: web, API, cloud,
          network, mobile, identity and OSINT nodes connected to a central target.
        </title>

        <circle cx="220" cy="200" r="150" fill="none" stroke="var(--color-border)" strokeDasharray="2 6" />
        <circle cx="220" cy="200" r="96" fill="none" stroke="var(--color-border-subtle)" />

        {NODES.map((n, i) => (
          <line
            key={`spoke-${n.label}`}
            x1="220"
            y1="200"
            x2={n.x}
            y2={n.y}
            stroke={FLOW.includes(i) ? "var(--color-accent)" : "#2A3A4D"}
            strokeWidth={FLOW.includes(i) ? 1.5 : 1}
            className={FLOW.includes(i) ? "hero-flow" : undefined}
          />
        ))}

        {/* Central target hexagon + chevron mark */}
        <polygon
          points="220,166 249.4,183 249.4,217 220,234 190.6,217 190.6,183"
          fill="var(--color-surface)"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
        />
        <path
          d="M206 192 L220 214 L234 192"
          fill="none"
          stroke="var(--color-foreground)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="220" cy="180" r="3" fill="var(--color-accent)" />
        <text
          x="220"
          y="252"
          textAnchor="middle"
          fill="var(--color-muted)"
          fontFamily="var(--font-mono)"
          fontSize="10"
          letterSpacing="1.4"
        >
          TARGET ORG
        </text>

        {NODES.map((n) => (
          <g key={`node-${n.label}`}>
            <circle cx={n.x} cy={n.y} r="6" fill="var(--color-background)" stroke="var(--color-accent)" strokeWidth="1.5" />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.entry ? 3 : 2}
              fill={n.entry ? "var(--color-accent-secondary)" : "var(--color-dim)"}
              className={n.entry ? "hero-pulse" : undefined}
            />
            <text
              x={n.x + n.dx}
              y={n.y + n.dy}
              textAnchor={n.anchor}
              fill="var(--color-foreground)"
              fontFamily="var(--font-mono)"
              fontSize="11.5"
              letterSpacing="1"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {[
          { c: "var(--color-accent)", t: "Asset" },
          { c: "var(--color-accent-secondary)", t: "Entry point" },
          { c: "var(--color-dim)", t: "Cross-link" },
        ].map((l) => (
          <span key={l.t} className="text-technical inline-flex items-center gap-1.5 text-dim">
            <span className="inline-block size-2 rounded-full" style={{ background: l.c }} />
            {l.t}
          </span>
        ))}
      </div>
    </figure>
  );
}
