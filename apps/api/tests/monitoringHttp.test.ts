/**
 * Monitoring + abuse controls — HTTP integration tests (Phase 13).
 *
 * Exercises the wired app end-to-end over Fastify inject:
 *   - correlation ids: every response echoes x-request-id; an inbound id is
 *     honored; error envelopes carry the same id.
 *   - abuse controls: per-user and per-IP limits trip a uniform 429/RATE_LIMITED
 *     with no limit details leaked.
 *   - observability: security events are emitted to an injected memory sink and
 *     are redaction-safe (no flags/passwords/tokens ever appear in a sink line).
 *
 * A memory sink is injected so we can assert on emitted events without relying
 * on stdout, and detection thresholds are irrelevant here (they never block).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"
import { createMemorySink, type MemorySink } from "../src/monitoring/sink.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
const COOKIE = config.sessionCookieName
const ORIGIN = "http://localhost:5173"
const PASSWORD = "correct horse battery"
const SLUG = "reflected-xss"
const CORRECT_FLAG = "CYVANTAS{reflected_xss_input_reflected_unencoded}"

let app: FastifyInstance
let sink: MemorySink

beforeEach(async () => {
  sink = createMemorySink()
  app = await buildApp({ config, repositories: createInMemoryRepositories(), sink })
  await app.ready()
})
afterEach(async () => {
  await app.close()
})

function auth(token: string) {
  return { headers: { origin: ORIGIN }, cookies: { [COOKIE]: token } }
}

async function token(email: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin: ORIGIN },
    payload: { email, password: PASSWORD, displayName: "User" },
  })
  return res.cookies.find((c) => c.name === COOKIE)!.value
}

describe("correlation ids", () => {
  it("echoes a generated x-request-id on every response", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/challenges" })
    const id = res.headers["x-request-id"]
    expect(typeof id).toBe("string")
    expect((id as string).length).toBeGreaterThan(0)
  })

  it("honors a sane inbound x-request-id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges",
      headers: { "x-request-id": "trace-abc-123" },
    })
    expect(res.headers["x-request-id"]).toBe("trace-abc-123")
  })

  it("attaches the request id to error envelopes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges/does-not-exist",
      headers: { "x-request-id": "trace-err-1" },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.requestId).toBe("trace-err-1")
  })
})

describe("abuse controls — per-user limit", () => {
  it("trips a uniform 429/RATE_LIMITED with no limit details leaked", async () => {
    const t = await token("peruser@example.com")
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      ...auth(t),
    })
    const id = created.json().data.environmentId
    let limited: ReturnType<typeof JSON.parse> | null = null
    for (let i = 0; i < 20; i += 1) {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/challenges/${SLUG}/submit`,
        ...auth(t),
        payload: { environmentId: id, answer: "wrong" },
      })
      if (res.statusCode === 429) {
        limited = res.json()
        break
      }
    }
    expect(limited).not.toBeNull()
    expect(limited!.error.code).toBe("RATE_LIMITED")
    // No limit / remaining / scope leaks to the client.
    expect(JSON.stringify(limited)).not.toMatch(/remaining|limit\b|window|user|ip/i)
    expect(sink.events.some((e) => e.name === "RATE_LIMIT_EXCEEDED")).toBe(true)
  })
})

describe("abuse controls — per-IP ceiling across accounts", () => {
  it("trips the per-IP env-create ceiling even as different users act from one ip", async () => {
    // Per-user create limit is 20/min; the per-IP ceiling is 60/min. Register a
    // few accounts (register itself is capped at 5/hour per IP) and round-robin
    // env-create across them so no single user reaches 20 before the shared IP
    // origin crosses 60 — the IP ceiling must deny with a :ip-scoped event.
    const tokens: string[] = []
    for (let i = 0; i < 4; i += 1) tokens.push(await token(`ipflood${i}@example.com`))
    let limited = false
    for (let i = 0; i < 100 && !limited; i += 1) {
      const t = tokens[i % tokens.length]!
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/challenges/${SLUG}/environments`,
        ...auth(t),
      })
      if (res.statusCode === 429) {
        expect(res.json().error.code).toBe("RATE_LIMITED")
        limited = true
      }
    }
    expect(limited).toBe(true)
    const denied = sink.events.filter((e) => e.name === "RATE_LIMIT_EXCEEDED")
    expect(denied.some((e) => (e.detail?.signal as string)?.endsWith(":ip"))).toBe(true)
  })
})

describe("observability — redaction safety", () => {
  it("never writes a flag, password, or session token into any emitted event", async () => {
    const t = await token("redact@example.com")
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      ...auth(t),
    })
    const id = created.json().data.environmentId
    // Submit the REAL flag: the submission path must not spill it into an event.
    await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(t),
      payload: { environmentId: id, answer: CORRECT_FLAG },
    })
    const serialized = JSON.stringify(sink.events)
    expect(serialized).not.toContain(CORRECT_FLAG)
    expect(serialized).not.toContain("CYVANTAS{")
    expect(serialized).not.toContain(PASSWORD)
    expect(serialized).not.toContain(t)
  })

  it("emits structured audit-derived events with a server-derived actor", async () => {
    const t = await token("actor@example.com")
    await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      ...auth(t),
    })
    const created = sink.events.find(
      (e) => e.name === "CHALLENGE_ENVIRONMENT_REQUESTED" || e.name === "ENVIRONMENT_CREATED",
    )
    expect(created).toBeDefined()
    expect(typeof created!.actorId === "string" || created!.actorId === null).toBe(true)
  })
})
