/**
 * Fixed-window rate limiter backed by a SharedStateStore.
 *
 * SCOPE: the limiter holds NO state of its own — every counter lives in the
 * injected `SharedStateStore`. With the in-memory store (the default) this is a
 * single-process limiter suitable for local dev, tests, and a genuine
 * single-instance deployment. Injecting a Redis-backed store (see
 * src/infra/redisSharedStateStore.ts) makes the SAME limiter correct across
 * horizontally-scaled replicas — the counters are then shared. See
 * docs/PRODUCTION-INFRASTRUCTURE.md → Redis and docs/ABUSE-CONTROLS.md.
 *
 * Algorithm: a fixed window keyed by `floor(now / windowMs) * windowMs`. Each
 * check atomically INCRs the window bucket and, on the first hit, sets its TTL
 * so buckets self-expire. This maps 1:1 onto Redis `INCR` + `EXPIRE`, and the
 * in-memory store implements the same contract.
 */
import type { SharedStateStore } from "../infra/sharedState.ts"

export interface RateLimitResult {
  allowed: boolean
  /** Requests remaining in the current window (never negative). */
  remaining: number
  /** Epoch ms when the current window resets. */
  resetAt: number
}

export interface RateLimitRule {
  /** Max requests permitted per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimiter {
  /**
   * Record one hit against `key` and report whether it is within `rule`.
   * Async because the backing store may be remote (Redis). Callers MUST treat a
   * rejected promise as a denial (fail-closed) — see abuseGuard.ts.
   */
  check(key: string, rule: RateLimitRule): Promise<RateLimitResult>
}

// One extra second of TTL headroom so a bucket never expires a hair before its
// logical window boundary under clock jitter.
const TTL_HEADROOM_SECONDS = 1

/**
 * Create a rate limiter over a SharedStateStore. `now` is injectable so tests
 * can drive windows deterministically; it MUST share the clock used to build
 * the in-memory store so TTL expiry and window math agree.
 */
export function createSharedStateRateLimiter(
  store: SharedStateStore,
  now: () => number = Date.now,
): RateLimiter {
  return {
    async check(key, rule): Promise<RateLimitResult> {
      const t = now()
      const windowStart = Math.floor(t / rule.windowMs) * rule.windowMs
      const bucket = `rl:${key}:${windowStart}`
      const count = await store.increment(bucket, 1)
      if (count === 1) {
        await store.expire(
          bucket,
          Math.ceil(rule.windowMs / 1000) + TTL_HEADROOM_SECONDS,
        )
      }
      const resetAt = windowStart + rule.windowMs
      return {
        allowed: count <= rule.limit,
        remaining: Math.max(0, rule.limit - count),
        resetAt,
      }
    },
  }
}

// Baseline rules. Auth endpoints are stricter than general authenticated API.
//
// Two enforcement scopes exist (Phase 13): per-USER rules bound what one
// account can do; per-IP rules bound what one network origin can do regardless
// of account (they blunt credential stuffing / many-account abuse from a single
// source). An endpoint may be gated by both — the tighter one trips first. IP
// rules are set ABOVE the corresponding per-user rule so a single legitimate
// user never trips the IP limit, while a burst across many accounts still does.
export const RATE_RULES = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 / 15min per IP+email
  register: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 / hour per IP
  authApi: { limit: 120, windowMs: 60 * 1000 }, // 120 / min per user/IP
  // Challenge endpoints (Phase 11), keyed per user. Submission is the tightest
  // to blunt flag brute-forcing; creation/reset are throttled to prevent abuse.
  challengeEnvironmentCreate: { limit: 20, windowMs: 60 * 1000 }, // 20 / min
  challengeEnvironmentReset: { limit: 30, windowMs: 60 * 1000 }, // 30 / min
  challengeSubmit: { limit: 15, windowMs: 60 * 1000 }, // 15 / min per user
  // Environment control-plane endpoints (Phase 9 routes), keyed per user.
  environmentCreate: { limit: 30, windowMs: 60 * 1000 }, // 30 / min per user
  environmentMutate: { limit: 60, windowMs: 60 * 1000 }, // 60 / min per user
  // Per-IP ceilings (Phase 13). Coarser than the per-user rules above.
  loginPerIp: { limit: 30, windowMs: 15 * 60 * 1000 }, // 30 / 15min per IP
  challengeSubmitPerIp: { limit: 60, windowMs: 60 * 1000 }, // 60 / min per IP
  challengeEnvironmentCreatePerIp: { limit: 60, windowMs: 60 * 1000 },
  challengeEnvironmentResetPerIp: { limit: 90, windowMs: 60 * 1000 },
  environmentCreatePerIp: { limit: 90, windowMs: 60 * 1000 }, // 90 / min per IP
  environmentMutatePerIp: { limit: 180, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>
