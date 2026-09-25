/**
 * Abuse guard (Phase 13) — fail-closed enforcement of layered rate limits.
 *
 * A single request may be checked against several scopes at once (e.g. a
 * per-USER submission limit AND a per-IP submission limit). `evaluateAbuseChecks`
 * runs them in order and returns the first scope that denies — and it is
 * FAIL-CLOSED: if the underlying limiter throws (misconfiguration, shared-store
 * outage in a future Redis-backed implementation), the request is treated as
 * DENIED rather than allowed. For security-sensitive operations (auth, flag
 * submission, environment creation) that conservative default is required — we
 * never fall open on uncertainty.
 *
 * `enforceAbuseControls` adds the side effects a route needs: on denial it emits
 * a RATE_LIMIT_EXCEEDED security event (scope only — never the raw counter key)
 * and throws a uniform 429 ApiError. The error body carries no scope, no limit,
 * and no remaining-count, so a client cannot map the response to a specific
 * control or discover the thresholds.
 */
import { ApiError } from "../types/api.ts"
import type { RateLimiter, RateLimitRule } from "./rateLimiter.ts"
import type { RequestContext, SecurityMonitor } from "../monitoring/securityMonitor.ts"

export interface AbuseCheck {
  /** Human-readable scope for observability (e.g. "challenge-submit:ip"). */
  scope: string
  /** Counter key. Kept internal — never returned to the client. */
  key: string
  rule: RateLimitRule
}

export interface AbuseGuardDeps {
  limiter: RateLimiter
  monitor: SecurityMonitor
}

/**
 * Returns the first check that denies the request, or null if all pass.
 * Fail-closed: a throwing/rejecting limiter denies (returns the offending
 * check). The limiter is async because its backing store may be remote (Redis);
 * a store outage must therefore DENY, never fall open.
 */
export async function evaluateAbuseChecks(
  limiter: RateLimiter,
  checks: readonly AbuseCheck[],
): Promise<AbuseCheck | null> {
  for (const check of checks) {
    try {
      const outcome = await limiter.check(check.key, check.rule)
      if (!outcome.allowed) return check
    } catch {
      // Fail closed: if we cannot confirm the request is under the limit, deny.
      return check
    }
  }
  return null
}

/**
 * Enforce all checks. On denial: emit a security event and throw 429. The
 * thrown error intentionally reveals nothing about which limit was hit.
 */
export async function enforceAbuseControls(
  deps: AbuseGuardDeps,
  ctx: RequestContext,
  checks: readonly AbuseCheck[],
): Promise<void> {
  const denied = await evaluateAbuseChecks(deps.limiter, checks)
  if (denied) {
    deps.monitor.rateLimited(denied.scope, ctx)
    throw new ApiError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      429,
    )
  }
}
