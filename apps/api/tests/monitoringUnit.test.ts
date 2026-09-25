/**
 * Monitoring primitives — unit tests (Phase 13).
 *
 * Covers the pure building blocks that the security monitor is composed of:
 * redaction (secret scrubbing + bounding), the fixed-window detection tracker
 * (observe-only, tripped-once-per-window), and the security monitor itself
 * (audit translation, detection escalation, redaction on the way out). All
 * clocks are injected so the tests are deterministic and never sleep.
 */
import { describe, it, expect } from "vitest"
import {
  redactDetail,
  sanitizeIp,
  sanitizeUserAgent,
  REDACTED,
} from "../src/monitoring/redaction.ts"
import { createDetectionTracker } from "../src/monitoring/detection.ts"
import { createSecurityMonitor } from "../src/monitoring/securityMonitor.ts"
import { createMemorySink } from "../src/monitoring/sink.ts"
import type { SecurityDetectionConfig } from "../src/monitoring/securityMonitor.ts"

describe("redaction", () => {
  it("redacts the value of any sensitive-looking key", () => {
    const out = redactDetail({
      password: "hunter2",
      token: "abc.def.ghi",
      sessionToken: "s3cr3t",
      flag: "CYVANTAS{x}",
      authorization: "Bearer y",
      apiKey: "k",
      answer: "the-answer",
      passwordHash: "h",
      safe: "keep-me",
    })!
    expect(out.password).toBe(REDACTED)
    expect(out.token).toBe(REDACTED)
    expect(out.sessionToken).toBe(REDACTED)
    expect(out.flag).toBe(REDACTED)
    expect(out.authorization).toBe(REDACTED)
    expect(out.apiKey).toBe(REDACTED)
    expect(out.answer).toBe(REDACTED)
    expect(out.passwordHash).toBe(REDACTED)
    expect(out.safe).toBe("keep-me")
  })

  it("scrubs sensitive keys nested inside objects and arrays", () => {
    const out = redactDetail({
      outer: { inner: { password: "p", ok: 1 } },
      list: [{ token: "t" }, { ok: 2 }],
    })!
    const outer = out.outer as Record<string, Record<string, unknown>>
    expect(outer.inner!.password).toBe(REDACTED)
    expect(outer.inner!.ok).toBe(1)
    const list = out.list as Array<Record<string, unknown>>
    expect(list[0]!.token).toBe(REDACTED)
    expect(list[1]!.ok).toBe(2)
  })

  it("caps oversized strings and deep structures", () => {
    const long = "x".repeat(1000)
    const out = redactDetail({ long })!
    expect((out.long as string).length).toBeLessThanOrEqual(513)
    // An object nested past the max depth collapses to the placeholder.
    const deep = redactDetail({ a: { b: { c: { d: { e: { f: "x" } } } } } })!
    const a = deep.a as Record<string, unknown>
    const b = a.b as Record<string, unknown>
    const c = b.c as Record<string, unknown>
    const d = c.d as Record<string, unknown>
    expect(d.e).toBe(REDACTED)
  })

  it("bounds and normalizes ip / user-agent", () => {
    expect(sanitizeIp("")).toBeNull()
    expect(sanitizeIp("  1.2.3.4  ")).toBe("1.2.3.4")
    expect(sanitizeIp("z".repeat(100))!.length).toBeLessThanOrEqual(65)
    expect(sanitizeUserAgent("")).toBeNull()
    expect(sanitizeUserAgent("Mozilla")).toBe("Mozilla")
    expect(sanitizeUserAgent("u".repeat(500))!.length).toBeLessThanOrEqual(257)
  })
})

describe("detection tracker", () => {
  it("trips exactly on the occurrence reaching the threshold, once per window", () => {
    const t = 0
    const tracker = createDetectionTracker(() => t)
    const rule = { threshold: 3, windowMs: 1000 }
    expect(tracker.record("k", rule).tripped).toBe(false) // 1
    expect(tracker.record("k", rule).tripped).toBe(false) // 2
    const third = tracker.record("k", rule) // 3 → trips
    expect(third.tripped).toBe(true)
    expect(third.count).toBe(3)
    expect(tracker.record("k", rule).tripped).toBe(false) // 4, no re-trip
  })

  it("resets when the window elapses", () => {
    let t = 0
    const tracker = createDetectionTracker(() => t)
    const rule = { threshold: 2, windowMs: 1000 }
    tracker.record("k", rule)
    expect(tracker.record("k", rule).tripped).toBe(true)
    t = 1001
    expect(tracker.record("k", rule).tripped).toBe(false) // fresh window
  })
})

const CONFIG: SecurityDetectionConfig = {
  failedAuth: { threshold: 3, windowMs: 60_000 },
  challengeSubmission: { threshold: 3, windowMs: 60_000 },
  environmentActivity: { threshold: 3, windowMs: 60_000 },
  invalidSession: { threshold: 3, windowMs: 60_000 },
  requestBurst: { threshold: 3, windowMs: 60_000 },
}

function monitorWith(now: () => Date) {
  const sink = createMemorySink()
  const monitor = createSecurityMonitor({
    sink,
    detection: createDetectionTracker(() => now().getTime()),
    config: CONFIG,
    now,
  })
  return { sink, monitor }
}

describe("security monitor", () => {
  it("translates an audit event into a structured, categorized event", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    monitor.fromAudit({ event: "LOGIN_SUCCESS", userId: "u1", ip: "1.2.3.4", userAgent: "UA" })
    expect(sink.events).toHaveLength(1)
    const e = sink.events[0]!
    expect(e.name).toBe("LOGIN_SUCCESS")
    expect(e.category).toBe("AUTH")
    expect(e.outcome).toBe("success")
    expect(e.actorId).toBe("u1")
    expect(e.ip).toBe("1.2.3.4")
  })

  it("escalates AUTH_ABUSE_SUSPECTED after repeated failed auth (per ip)", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    for (let i = 0; i < 3; i++) {
      monitor.fromAudit({ event: "LOGIN_FAILURE", userId: null, ip: "9.9.9.9", userAgent: null })
    }
    const escalations = sink.events.filter((e) => e.name === "AUTH_ABUSE_SUSPECTED")
    expect(escalations.length).toBeGreaterThanOrEqual(1)
    const first = escalations[0]!
    expect(first.category).toBe("ABUSE")
    expect(first.severity).toBe("ALERT")
    expect(first.outcome).toBe("detected")
  })

  it("escalates CHALLENGE_SUBMISSION_ABUSE_SUSPECTED after repeated submissions (per user)", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    for (let i = 0; i < 3; i++) {
      monitor.fromAudit({ event: "CHALLENGE_SUBMISSION_REJECTED", userId: "u2", ip: "1.1.1.1", userAgent: null })
    }
    expect(sink.events.some((e) => e.name === "CHALLENGE_SUBMISSION_ABUSE_SUSPECTED")).toBe(true)
  })

  it("escalates ENVIRONMENT_ABUSE_SUSPECTED after repeated env activity (per user)", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    for (let i = 0; i < 3; i++) {
      monitor.fromAudit({ event: "ENVIRONMENT_CREATED", userId: "u3", ip: "1.1.1.1", userAgent: null })
    }
    expect(sink.events.some((e) => e.name === "ENVIRONMENT_ABUSE_SUSPECTED")).toBe(true)
  })

  it("emits INVALID_SESSION_PRESENTED and escalates after repeats", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    const ctx = { ip: "5.5.5.5", requestId: "r", actorId: null }
    for (let i = 0; i < 3; i++) monitor.invalidSession(ctx)
    expect(sink.events.filter((e) => e.name === "INVALID_SESSION_PRESENTED")).toHaveLength(3)
    expect(sink.events.some((e) => e.name === "INVALID_SESSION_ABUSE_SUSPECTED")).toBe(true)
  })

  it("emits REQUEST_BURST_SUSPECTED once the request burst threshold is crossed", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    const ctx = { ip: "7.7.7.7", requestId: "r", actorId: null }
    for (let i = 0; i < 3; i++) monitor.requestObserved(ctx)
    expect(sink.events.some((e) => e.name === "REQUEST_BURST_SUSPECTED")).toBe(true)
  })

  it("redacts sensitive detail on rateLimited before it reaches the sink", () => {
    const { sink, monitor } = monitorWith(() => new Date(0))
    monitor.rateLimited("challenge-submit:user", { ip: "1.2.3.4" }, { token: "secret", signalNote: "ok" })
    const e = sink.events.find((ev) => ev.name === "RATE_LIMIT_EXCEEDED")!
    expect(e.detail!.token).toBe(REDACTED)
    expect(e.detail!.signal).toBe("challenge-submit:user")
  })
})
