/**
 * In-memory fixed-window rate limiter.
 *
 * SCOPE / LIMITATION: this is a single-process, in-memory limiter intended for
 * local development and single-instance deployments. It is NOT horizontally
 * scalable — counters are per-process, so behind multiple replicas each replica
 * keeps its own window. A production multi-instance deployment must back this
 * with a shared store (e.g. Redis). This module intentionally exposes a narrow
 * interface so that a shared-store implementation can replace it without
 * touching callers. See docs/AUTH.md → Rate limiting.
 */

export interface RateLimitResult {
  allowed: boolean
  /** Requests remaining in the current window. */
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

interface WindowState {
  count: number
  resetAt: number
}

export interface RateLimiter {
  check(key: string, rule: RateLimitRule): RateLimitResult
  reset(key?: string): void
}

export function createInMemoryRateLimiter(
  now: () => number = Date.now,
): RateLimiter {
  const windows = new Map<string, WindowState>()

  return {
    check(key, rule): RateLimitResult {
      const t = now()
      const existing = windows.get(key)

      if (!existing || existing.resetAt <= t) {
        const state: WindowState = { count: 1, resetAt: t + rule.windowMs }
        windows.set(key, state)
        return { allowed: true, remaining: rule.limit - 1, resetAt: state.resetAt }
      }

      if (existing.count >= rule.limit) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt }
      }

      existing.count += 1
      return {
        allowed: true,
        remaining: rule.limit - existing.count,
        resetAt: existing.resetAt,
      }
    },

    reset(key): void {
      if (key === undefined) windows.clear()
      else windows.delete(key)
    },
  }
}

// Baseline rules. Auth endpoints are stricter than general authenticated API.
export const RATE_RULES = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 / 15min per IP+email
  register: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 / hour per IP
  authApi: { limit: 120, windowMs: 60 * 1000 }, // 120 / min per user/IP
} as const satisfies Record<string, RateLimitRule>
