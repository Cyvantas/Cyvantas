/**
 * Abuse guard — unit tests (Phase 13).
 *
 * The guard is the enforcement half of the abuse controls (the monitor's
 * detection is the observe-only half). These tests pin the two behaviors that
 * matter for security: layered checks deny on the FIRST tripped scope, and the
 * guard is FAIL-CLOSED — a limiter that throws is treated as a denial, never
 * as an allow. On denial it emits a RATE_LIMIT_EXCEEDED event carrying the
 * scope (never the raw key) and throws a uniform 429 that reveals no limits.
 */
import { describe, it, expect } from "vitest"
import { evaluateAbuseChecks, enforceAbuseControls } from "../src/security/abuseGuard.ts"
import type { AbuseCheck } from "../src/security/abuseGuard.ts"
import type { RateLimiter, RateLimitResult } from "../src/security/rateLimiter.ts"
import { createSecurityMonitor } from "../src/monitoring/securityMonitor.ts"
import { createDetectionTracker } from "../src/monitoring/detection.ts"
import { createMemorySink } from "../src/monitoring/sink.ts"
import { ApiError } from "../src/types/api.ts"
import type { SecurityDetectionConfig } from "../src/monitoring/securityMonitor.ts"

const CONFIG: SecurityDetectionConfig = {
  failedAuth: { threshold: 100, windowMs: 60_000 },
  challengeSubmission: { threshold: 100, windowMs: 60_000 },
  environmentActivity: { threshold: 100, windowMs: 60_000 },
  invalidSession: { threshold: 100, windowMs: 60_000 },
  requestBurst: { threshold: 100, windowMs: 60_000 },
}

function monitor() {
  const sink = createMemorySink()
  const m = createSecurityMonitor({
    sink,
    detection: createDetectionTracker(() => 0),
    config: CONFIG,
    now: () => new Date(0),
  })
  return { sink, monitor: m }
}

const RULE = { limit: 5, windowMs: 1000 }
const allow: RateLimitResult = { allowed: true, remaining: 4, resetAt: 1000 }
const deny: RateLimitResult = { allowed: false, remaining: 0, resetAt: 1000 }

function limiterReturning(map: Record<string, RateLimitResult>): RateLimiter {
  return {
    check: (key) => map[key] ?? allow,
    reset: () => {},
  }
}

const checks: AbuseCheck[] = [
  { scope: "submit:user", key: "submit:user:u1", rule: RULE },
  { scope: "submit:ip", key: "submit:ip:1.2.3.4", rule: RULE },
]

describe("evaluateAbuseChecks", () => {
  it("returns null when every check is under the limit", () => {
    const limiter = limiterReturning({})
    expect(evaluateAbuseChecks(limiter, checks)).toBeNull()
  })

  it("returns the first tripped check (order matters)", () => {
    const limiter = limiterReturning({ "submit:user:u1": deny, "submit:ip:1.2.3.4": deny })
    expect(evaluateAbuseChecks(limiter, checks)!.scope).toBe("submit:user")
  })

  it("is FAIL-CLOSED: a throwing limiter denies the request", () => {
    const throwing: RateLimiter = {
      check: () => {
        throw new Error("limiter store unavailable")
      },
      reset: () => {},
    }
    const denied = evaluateAbuseChecks(throwing, checks)
    expect(denied).not.toBeNull()
    expect(denied!.scope).toBe("submit:user")
  })
})

describe("enforceAbuseControls", () => {
  const ctx = { ip: "1.2.3.4", requestId: "r1", actorId: "u1" }

  it("does nothing when all checks pass", () => {
    const { sink, monitor: m } = monitor()
    const limiter = limiterReturning({})
    expect(() => enforceAbuseControls({ limiter, monitor: m }, ctx, checks)).not.toThrow()
    expect(sink.events).toHaveLength(0)
  })

  it("throws a uniform 429 and emits a scope-only event on denial", () => {
    const { sink, monitor: m } = monitor()
    const limiter = limiterReturning({ "submit:ip:1.2.3.4": deny })
    let thrown: unknown
    try {
      enforceAbuseControls({ limiter, monitor: m }, ctx, checks)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(ApiError)
    const err = thrown as ApiError
    expect(err.status).toBe(429)
    expect(err.code).toBe("RATE_LIMITED")
    // The client-facing message reveals no scope, limit, or remaining count.
    expect(err.message).not.toMatch(/submit|ip|user|limit|\d/)

    const event = sink.events.find((e) => e.name === "RATE_LIMIT_EXCEEDED")!
    expect(event.category).toBe("RATE_LIMIT")
    expect(event.outcome).toBe("denied")
    // The event carries the human-readable scope but NOT the raw counter key.
    expect(event.detail!.signal).toBe("submit:ip")
    expect(JSON.stringify(event)).not.toContain("submit:ip:1.2.3.4")
  })
})
