/**
 * Content-Security-Policy composition. Pure, local, and framework-free: the
 * panel holds a source list per directive and this module turns it into a
 * policy string plus a plain-language explanation. Nothing here touches the
 * network or storage.
 */

export type CspDirective =
  | "default-src"
  | "script-src"
  | "style-src"
  | "img-src"
  | "font-src"
  | "connect-src"
  | "frame-src"
  | "object-src"
  | "base-uri"
  | "form-action";

interface DirectiveMeta {
  name: CspDirective;
  /** What this directive controls, in plain language. */
  summary: string;
  /** Fallback behaviour when the directive is omitted. */
  fallback: string;
}

/** Directives in canonical output order, with human explanations. */
export const CSP_DIRECTIVES: DirectiveMeta[] = [
  {
    name: "default-src",
    summary: "Baseline allow-list for content types that have no more specific directive.",
    fallback: "Other fetch directives fall back to this when unset.",
  },
  {
    name: "script-src",
    summary: "Where scripts may be loaded and executed from.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "style-src",
    summary: "Where stylesheets may be loaded from.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "img-src",
    summary: "Where images may be loaded from.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "font-src",
    summary: "Where web fonts may be loaded from.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "connect-src",
    summary: "Endpoints reachable via fetch, XHR, WebSocket, and EventSource.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "frame-src",
    summary: "Sources allowed to be embedded as frames.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "object-src",
    summary: "Sources for <object>, <embed>, and <applet>. 'none' is strongly recommended.",
    fallback: "Falls back to default-src.",
  },
  {
    name: "base-uri",
    summary: "Restricts the URLs usable in a document's <base> element.",
    fallback: "Does NOT fall back to default-src; unset means any base URI is allowed.",
  },
  {
    name: "form-action",
    summary: "Restricts where forms may submit to.",
    fallback: "Does NOT fall back to default-src; unset means forms may submit anywhere.",
  },
];

interface SourceMeta {
  token: string;
  label: string;
  /** What allowing this source means, and any risk. */
  note: string;
  /** Marks sources that materially weaken the policy. */
  risky?: boolean;
}

/** Common keyword / scheme sources offered as quick toggles. */
export const COMMON_SOURCES: SourceMeta[] = [
  { token: "'self'", label: "'self'", note: "Same-origin content only." },
  { token: "'none'", label: "'none'", note: "Blocks all sources for this directive." },
  {
    token: "'unsafe-inline'",
    label: "'unsafe-inline'",
    note: "Allows inline scripts/styles — defeats much of CSP's XSS protection.",
    risky: true,
  },
  {
    token: "'unsafe-eval'",
    label: "'unsafe-eval'",
    note: "Allows eval() and similar — avoid unless strictly required.",
    risky: true,
  },
  { token: "https:", label: "https:", note: "Any origin served over HTTPS." },
  { token: "data:", label: "data:", note: "data: URIs — convenient but can carry injected payloads.", risky: true },
  { token: "blob:", label: "blob:", note: "blob: URIs, e.g. for generated media or workers." },
  { token: "*", label: "*", note: "Any origin — effectively disables the directive.", risky: true },
];

export type CspValues = Record<CspDirective, string[]>;

export const EMPTY_CSP_VALUES: CspValues = {
  "default-src": [],
  "script-src": [],
  "style-src": [],
  "img-src": [],
  "font-src": [],
  "connect-src": [],
  "frame-src": [],
  "object-src": [],
  "base-uri": [],
  "form-action": [],
};

const dedupe = (sources: string[]): string[] => Array.from(new Set(sources));

/** Build the header value: `directive src…; directive src…`. */
export function buildCspPolicy(values: CspValues): string {
  return CSP_DIRECTIVES.map((meta) => meta.name)
    .filter((name) => values[name] && values[name].length > 0)
    .map((name) => `${name} ${dedupe(values[name]).join(" ")}`)
    .join("; ");
}

export interface CspExplanationEntry {
  directive: CspDirective;
  sources: string[];
  summary: string;
  /** Warnings raised by risky or contradictory sources. */
  warnings: string[];
}

/** Per-directive explanation of the current selection, including caveats. */
export function explainCsp(values: CspValues): CspExplanationEntry[] {
  const riskyTokens = new Set(COMMON_SOURCES.filter((s) => s.risky).map((s) => s.token));

  return CSP_DIRECTIVES.filter((meta) => values[meta.name].length > 0).map((meta) => {
    const sources = dedupe(values[meta.name]);
    const warnings: string[] = [];

    if (sources.includes("'none'") && sources.length > 1) {
      warnings.push("'none' overrides all other sources — remove the others or drop 'none'.");
    }
    for (const token of sources) {
      if (riskyTokens.has(token)) {
        const meaning = COMMON_SOURCES.find((s) => s.token === token)?.note;
        warnings.push(`${token} weakens this directive. ${meaning ?? ""}`.trim());
      }
    }

    return { directive: meta.name, sources, summary: meta.summary, warnings };
  });
}
