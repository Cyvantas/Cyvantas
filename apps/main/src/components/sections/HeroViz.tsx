import { useId, useState } from "react";
import "./HeroViz.css";

// Archive topology; descriptions explain scope, never simulated scan results.
const NODES = [
  { id: "web", label: "WEB", x: 240, y: 64, entry: false, flow: false,
    title: "Public applications", description: "Websites, browser sessions and client-side exposure." },
  { id: "osint", label: "OSINT", x: 112, y: 130, entry: false, flow: false,
    title: "Public intelligence", description: "Public records, repositories and organizational footprint." },
  { id: "api", label: "API", x: 368, y: 130, entry: true, flow: true,
    title: "Application interfaces", description: "Endpoints, authorization boundaries and data exposure." },
  { id: "identity", label: "IDENTITY", x: 92, y: 232, entry: true, flow: true,
    title: "Identity and access", description: "Sign-in flows, federation and access privileges." },
  { id: "cloud", label: "CLOUD", x: 388, y: 232, entry: false, flow: true,
    title: "Cloud infrastructure", description: "Cloud resources, storage permissions and service configuration." },
  { id: "mobile", label: "MOBILE", x: 160, y: 320, entry: false, flow: false,
    title: "Mobile applications", description: "App storage, platform permissions and backend connections." },
  { id: "network", label: "NETWORK", x: 320, y: 320, entry: false, flow: false,
    title: "Network perimeter", description: "Exposed services, gateways and trust boundaries." },
];

/** Archive-led, illustrative radar with native keyboard and touch controls. */
export function HeroViz() {
  const uid = useId();
  const [selectedId, setSelectedId] = useState<string | null>("web");
  const [paused, setPaused] = useState(false);
  const selected = NODES.find((node) => node.id === selectedId);
  const captionId = `${uid}-caption`;
  const briefingId = `${uid}-briefing`;
  const sweepGradientId = `${uid}-sweep`;

  return (
    <figure
      className={`hero-model${paused ? " hero-model--paused" : ""}`}
      aria-labelledby={captionId}
      onKeyDown={(event) => {
        if (event.key === "Escape") setSelectedId(null);
      }}
    >
      <figcaption className="hero-model__header" id={captionId}>
        <span className="hero-model__heading">
          <span aria-hidden="true" className="hero-model__beacon" />
          Attack-surface model
        </span>
        <span className="hero-model__status">Illustrative</span>
      </figcaption>

      <div className="hero-model__radar" role="group" aria-label="Explore attack-surface domains">
        <svg viewBox="0 0 480 400" aria-hidden="true" focusable="false" className="hero-model__graphic">
          <defs>
            <linearGradient id={sweepGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.18" />
              <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="240" cy="200" r="88" className="hero-model__aura" />
          <g className="hero-model__grid" fill="none">
            <path d="M240 20V380 M40 200H440" strokeDasharray="2 6" />
            {[50, 100, 144, 180].map((radius, index) => (
              <circle key={radius} cx="240" cy="200" r={radius} strokeDasharray={index % 2 ? "2 6" : undefined} />
            ))}
          </g>
          <g className="hero-model__sweep">
            <path d="M240 200 L240 20 A180 180 0 0 1 390 100 Z" fill={`url(#${sweepGradientId})`} />
            <path d="M240 200 L390 100" className="hero-model__beam" />
          </g>
          <path
            d="M112 130 Q150 50 240 64 Q330 50 368 130 Q415 174 388 232 Q376 300 320 320 M92 232 Q110 302 160 320"
            fill="none" className="hero-model__cross-link"
          />
          {NODES.map((node) => (
            <line
              key={node.id} x1="240" y1="200" x2={node.x} y2={node.y}
              className={`hero-model__spoke${node.flow ? " hero-model__flow" : ""}${node.id === selectedId ? " hero-model__spoke--selected" : ""}`}
            />
          ))}
        </svg>
        <img
          className="hero-model__logo"
          src="/assets/attack-surface-radar/cyvantas-3d-logo-transparent.png"
          alt="CYVANTAS" width="512" height="512" draggable={false}
        />
        <span className="hero-model__target" aria-hidden="true">Target org</span>
        {NODES.map((node) => (
          <button
            key={node.id} type="button"
            className={`hero-model__node${node.entry ? " hero-model__node--entry" : ""}`}
            style={{ left: `${node.x / 480 * 100}%`, top: `${node.y / 400 * 100}%` }}
            aria-label={`${node.label}: ${node.title}${node.entry ? ", illustrative entry point" : ""}`}
            aria-pressed={node.id === selectedId} aria-controls={briefingId}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setSelectedId(node.id);
            }}
            onFocus={() => setSelectedId(node.id)}
            onClick={() => setSelectedId(node.id)}
          >
            <span className="hero-model__node-dot" aria-hidden="true" />
            <span>{node.label}</span>
          </button>
        ))}
      </div>
      <div className="hero-model__briefing" id={briefingId} aria-live="polite" aria-atomic="true">
        <span className="hero-model__briefing-label">{selected?.label ?? "Explore the model"}</span>
        <strong>{selected?.title ?? "Connected exposure"}</strong>
        <p>{selected?.description ?? "Select a domain to explore its role in an organization's attack surface."}</p>
      </div>
      <div className="hero-model__footer">
        <ul className="hero-model__legend" aria-label="Model legend">
          <li><span aria-hidden="true" className="hero-model__key" />Asset</li>
          <li><span aria-hidden="true" className="hero-model__key hero-model__key--entry" />Entry point</li>
          <li><span aria-hidden="true" className="hero-model__key hero-model__key--link" />Cross-link</li>
        </ul>
        <button
          type="button" className="hero-model__motion" aria-label="Pause model animation"
          aria-pressed={paused} onClick={() => setPaused((value) => !value)}
        >
          <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
          {paused ? "Resume motion" : "Pause motion"}
        </button>
      </div>
    </figure>
  );
}
