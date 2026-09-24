/**
 * CSRF defence for cookie-authenticated, state-changing requests.
 *
 * Strategy (defence in depth):
 *  1. SameSite=Lax session cookie (set at cookie creation) blocks the common
 *     cross-site POST vector from third-party pages.
 *  2. Origin/Referer allow-list validation on state-changing (POST) requests:
 *     the request's Origin (or Referer fallback) must match a configured,
 *     trusted origin. Requests with a foreign Origin are rejected.
 *
 * This avoids a synchronizer-token round-trip while still defeating classic
 * cross-site form/fetch CSRF, because a cross-site attacker cannot forge the
 * Origin header from a browser. See docs/AUTH.md → CSRF.
 */

function originFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined
  try {
    return new URL(referer).origin
  } catch {
    return undefined
  }
}

export interface CsrfCheckInput {
  origin: string | undefined
  referer: string | undefined
  allowedOrigins: readonly string[]
}

/**
 * Returns true when the request's browser origin is trusted. When neither
 * Origin nor Referer is present (e.g. same-origin non-browser client), the
 * check passes — SameSite cookies remain the backstop for browsers, which
 * always send Origin on cross-site state-changing fetches.
 */
export function isTrustedOrigin(input: CsrfCheckInput): boolean {
  const candidate = input.origin ?? originFromReferer(input.referer)
  if (candidate === undefined) return true
  return input.allowedOrigins.includes(candidate)
}
