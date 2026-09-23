/**
 * Local HTTP response-header analysis. The user pastes raw response headers;
 * this module parses them and reports which security headers are present,
 * missing, or worth reviewing. It never fetches a URL and makes no network
 * request — all evaluation is done on the pasted text.
 */

export type HeaderStatus = "present" | "missing" | "review";

export interface HeaderFinding {
  /** Canonical header name. */
  name: string;
  status: HeaderStatus;
  /** The parsed value, when the header was present. */
  value?: string;
  /** What the header does. */
  purpose: string;
  /** Status-specific guidance (why missing/review matters, or confirmation). */
  detail: string;
}

export interface HeaderAnalysis {
  /** Number of header lines successfully parsed. */
  parsedCount: number;
  findings: HeaderFinding[];
}

/**
 * Parse raw headers into a lowercase-keyed map. Accepts an optional leading
 * status line (e.g. "HTTP/2 200"), folds duplicate headers with commas, and
 * ignores blank lines. No network access.
 */
export function parseHeaders(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (/^HTTP\/\d/i.test(line)) continue; // status line
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key.length === 0) continue;
    const existing = map.get(key);
    map.set(key, existing ? `${existing}, ${value}` : value);
  }
  return map;
}

interface HeaderRule {
  name: string;
  key: string;
  purpose: string;
  /** Guidance shown when the header is absent. */
  missingDetail: string;
  /**
   * Evaluate a present value. Return a `review` status with a reason when the
   * value is weak or informational; otherwise `present`.
   */
  evaluate?: (value: string) => { status: "present" | "review"; detail: string };
}

const HEADER_RULES: HeaderRule[] = [
  {
    name: "Content-Security-Policy",
    key: "content-security-policy",
    purpose: "Restricts which sources of content the browser may load, mitigating XSS and injection.",
    missingDetail: "No CSP found. Consider defining a policy to constrain script, style, and other sources.",
    evaluate: (value) =>
      /unsafe-inline|unsafe-eval/i.test(value)
        ? {
            status: "review",
            detail: "Present, but includes 'unsafe-inline' or 'unsafe-eval', which weakens XSS protection.",
          }
        : { status: "present", detail: "A policy is defined." },
  },
  {
    name: "Strict-Transport-Security",
    key: "strict-transport-security",
    purpose: "Forces HTTPS for future requests (HSTS), preventing protocol-downgrade and SSL-strip attacks.",
    missingDetail: "No HSTS. Over HTTPS, add it so browsers refuse plaintext connections.",
    evaluate: (value) => {
      const maxAge = /max-age=(\d+)/i.exec(value);
      if (!maxAge) return { status: "review", detail: "Present but missing a max-age directive." };
      if (Number(maxAge[1]) < 15552000) {
        return { status: "review", detail: "max-age is below ~6 months; a longer max-age is recommended." };
      }
      return { status: "present", detail: "HSTS is enabled with a substantial max-age." };
    },
  },
  {
    name: "X-Frame-Options",
    key: "x-frame-options",
    purpose: "Legacy clickjacking protection controlling whether the page may be framed.",
    missingDetail: "Absent. Prefer CSP frame-ancestors; X-Frame-Options remains useful for older browsers.",
    evaluate: (value) =>
      /^(deny|sameorigin)$/i.test(value.trim())
        ? { status: "present", detail: `Framing is restricted (${value.trim()}).` }
        : { status: "review", detail: `Unusual value "${value}". Expected DENY or SAMEORIGIN.` },
  },
  {
    name: "X-Content-Type-Options",
    key: "x-content-type-options",
    purpose: "Stops MIME-type sniffing, forcing the browser to honour the declared Content-Type.",
    missingDetail: "Absent. Add 'nosniff' to prevent MIME confusion attacks.",
    evaluate: (value) =>
      value.trim().toLowerCase() === "nosniff"
        ? { status: "present", detail: "MIME sniffing is disabled." }
        : { status: "review", detail: `Expected 'nosniff', found "${value}".` },
  },
  {
    name: "Referrer-Policy",
    key: "referrer-policy",
    purpose: "Controls how much referrer information is sent with requests.",
    missingDetail: "Absent. Set a policy such as 'strict-origin-when-cross-origin' to limit referrer leakage.",
  },
  {
    name: "Permissions-Policy",
    key: "permissions-policy",
    purpose: "Enables or disables browser features (camera, geolocation, etc.) per origin.",
    missingDetail: "Absent. Restrict powerful features you do not use.",
  },
  {
    name: "Cross-Origin-Opener-Policy",
    key: "cross-origin-opener-policy",
    purpose: "Isolates the browsing context from cross-origin windows (mitigates XS-Leaks).",
    missingDetail: "Absent. 'same-origin' enables cross-origin isolation.",
  },
  {
    name: "Cross-Origin-Resource-Policy",
    key: "cross-origin-resource-policy",
    purpose: "Controls which origins may embed this resource.",
    missingDetail: "Optional. Consider 'same-origin' or 'same-site' for sensitive resources.",
  },
  {
    name: "X-XSS-Protection",
    key: "x-xss-protection",
    purpose: "Legacy browser XSS auditor toggle, now deprecated and removed from modern browsers.",
    missingDetail: "Absent, which is fine — this header is deprecated. Rely on CSP instead.",
    evaluate: (value) =>
      value.trim() === "0"
        ? { status: "present", detail: "Explicitly disabled (0), which is the modern recommendation." }
        : { status: "review", detail: "Deprecated header enabled; consider removing it and relying on CSP." },
  },
  {
    name: "Server",
    key: "server",
    purpose: "Advertises server software; can aid fingerprinting when detailed.",
    missingDetail: "Not disclosed — good for reducing fingerprinting surface.",
    evaluate: (value) =>
      /\d/.test(value)
        ? { status: "review", detail: `Reveals software/version ("${value}"). Consider trimming version detail.` }
        : { status: "review", detail: `Server software is disclosed ("${value}").` },
  },
  {
    name: "X-Powered-By",
    key: "x-powered-by",
    purpose: "Advertises the backend technology; unnecessary information disclosure.",
    missingDetail: "Not disclosed — good.",
    evaluate: (value) => ({
      status: "review",
      detail: `Discloses backend technology ("${value}"). Consider removing this header.`,
    }),
  },
];

const KNOWN_KEYS = new Set(HEADER_RULES.map((rule) => rule.key));
KNOWN_KEYS.add("set-cookie");

export function analyzeHeaders(raw: string): HeaderAnalysis {
  const headers = parseHeaders(raw);
  const findings: HeaderFinding[] = HEADER_RULES.map((rule) => {
    const value = headers.get(rule.key);
    if (value === undefined) {
      return { name: rule.name, status: "missing", purpose: rule.purpose, detail: rule.missingDetail };
    }
    const evaluated = rule.evaluate?.(value) ?? { status: "present" as const, detail: "Header is present." };
    return { name: rule.name, status: evaluated.status, value, purpose: rule.purpose, detail: evaluated.detail };
  });

  const cookies = headers.get("set-cookie");
  if (cookies !== undefined) {
    findings.push(evaluateCookie(cookies));
  }

  return { parsedCount: headers.size, findings };
}

function evaluateCookie(value: string): HeaderFinding {
  const missing: string[] = [];
  if (!/;\s*secure/i.test(value)) missing.push("Secure");
  if (!/;\s*httponly/i.test(value)) missing.push("HttpOnly");
  if (!/;\s*samesite/i.test(value)) missing.push("SameSite");
  const base = {
    name: "Set-Cookie",
    value,
    purpose: "Cookie attributes govern transport security, JS access, and cross-site sending.",
  };
  return missing.length === 0
    ? { ...base, status: "present", detail: "Cookie carries Secure, HttpOnly, and SameSite attributes." }
    : { ...base, status: "review", detail: `Cookie is missing recommended attribute(s): ${missing.join(", ")}.` };
}
