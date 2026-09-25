/**
 * Redaction rules for security events (Phase 13).
 *
 * Defense in depth: event `detail` payloads are built by our own code and
 * should never contain secrets, but every event is scrubbed again here before
 * it leaves the process. The scrubber:
 *   - replaces the VALUE of any sensitive-looking key with a placeholder
 *     (passwords, tokens, flags, authorization/cookie headers, secrets, hashes,
 *     session identifiers, api keys);
 *   - caps string length and recursion depth so an event can never balloon a
 *     log line or embed an unbounded payload;
 *   - normalizes user-agent / ip metadata to bounded strings.
 *
 * The rule is intentionally conservative: when in doubt, redact. It is far
 * better to lose a debugging detail than to write a credential to a log.
 */

export const REDACTED = "[REDACTED]" as const

/** Keys whose values must never be logged, matched case-insensitively. */
export const SENSITIVE_KEY_PATTERN =
  /pass(word)?|passwd|token|secret|flag|authorization|auth[-_]?header|cookie|credential|priv(ate)?[-_]?key|session[-_]?token|api[-_]?key|hash|answer/i

const MAX_STRING_LENGTH = 512
const MAX_DEPTH = 4
const MAX_UA_LENGTH = 256
const MAX_IP_LENGTH = 64

function capString(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === "string") return capString(value, MAX_STRING_LENGTH)
  if (typeof value === "number" || typeof value === "boolean") return value
  if (depth >= MAX_DEPTH) return REDACTED
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactValue(item, depth + 1))
  }
  if (typeof value === "object") {
    return redactRecord(value as Record<string, unknown>, depth + 1)
  }
  // Functions, symbols, bigint, etc. are never meaningful in an event.
  return REDACTED
}

function redactRecord(
  input: Record<string, unknown>,
  depth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : redactValue(value, depth)
  }
  return out
}

/** Scrub an event detail payload. Returns a new object; never mutates input. */
export function redactDetail(
  detail: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!detail) return undefined
  return redactRecord(detail, 0)
}

/** Bound the user-agent string; never trust its length. */
export function sanitizeUserAgent(
  ua: string | null | undefined,
): string | null {
  if (typeof ua !== "string" || ua.trim() === "") return null
  return capString(ua.trim(), MAX_UA_LENGTH)
}

/** Bound the ip string. IP is kept for correlation but never used for authz. */
export function sanitizeIp(ip: string | null | undefined): string | null {
  if (typeof ip !== "string" || ip.trim() === "") return null
  return capString(ip.trim(), MAX_IP_LENGTH)
}
