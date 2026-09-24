/**
 * Challenge HTTP tests (Phase 11) — end-to-end over Fastify inject.
 *
 * Covers the read-only catalog, the authenticated challenge-environment
 * lifecycle, and server-authoritative flag submission (which returns only
 * { correct }). The app wires the default registry, so the correct answer is
 * the deterministic educational default flag.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
const COOKIE = config.sessionCookieName
const ORIGIN = "http://localhost:5173"
const PASSWORD = "correct horse battery"
const SLUG = "reflected-xss"
const CORRECT_FLAG = "CYVANTAS{reflected_xss_input_reflected_unencoded}"

function cookieValue(res: { cookies: Array<{ name: string; value: string }> }): string {
  return res.cookies.find((c) => c.name === COOKIE)!.value
}

async function newApp(): Promise<FastifyInstance> {
  const app = await buildApp({ config, repositories: createInMemoryRepositories() })
  await app.ready()
  return app
}

async function registerAndToken(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin: ORIGIN },
    payload: { email, password: PASSWORD, displayName: "Challenge User" },
  })
  return cookieValue(res)
}

function auth(token: string) {
  return { headers: { origin: ORIGIN }, cookies: { [COOKIE]: token } }
}

async function createEnv(app: FastifyInstance, token: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `/api/v1/challenges/${SLUG}/environments`,
    ...auth(token),
  })
  return res.json().data.environmentId
}

describe("challenges — public catalog", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("lists challenges without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/challenges" })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data)).toBe(true)
  })

  it("returns detail (with objectives) for a known slug", async () => {
    const res = await app.inject({ method: "GET", url: `/api/v1/challenges/${SLUG}` })
    expect(res.statusCode).toBe(200)
    const dto = res.json().data
    expect(dto.slug).toBe(SLUG)
    expect(Array.isArray(dto.objectives)).toBe(true)
    expect(dto).not.toHaveProperty("hints")
    expect(dto).not.toHaveProperty("flag")
  })

  it("returns 404 CHALLENGE_NOT_FOUND for an unknown slug", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/challenges/ghost" })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("CHALLENGE_NOT_FOUND")
  })
})

describe("challenges — environment creation", () => {
  let app: FastifyInstance
  let token: string
  beforeEach(async () => {
    app = await newApp()
    token = await registerAndToken(app, "creator@example.com")
  })
  afterAll(async () => { await app.close() })

  it("requires a session", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      headers: { origin: ORIGIN },
    })
    expect(res.statusCode).toBe(401)
  })

  it("enforces a trusted origin (CSRF)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      headers: { origin: "http://evil.example" },
      cookies: { [COOKIE]: token },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe("CSRF_ORIGIN_REJECTED")
  })

  it("creates an environment and returns only a safe view", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      ...auth(token),
    })
    expect(res.statusCode).toBe(201)
    const dto = res.json().data
    expect(dto).toMatchObject({
      challengeSlug: SLUG,
      status: "REQUESTED",
      runtimeStatus: "NOT_PROVISIONED",
      runtimeConfigured: false,
      serviceUrl: null,
    })
    expect(dto).not.toHaveProperty("userId")
    expect(dto).not.toHaveProperty("metadata")
    expect(dto).not.toHaveProperty("failureMessage")
    expect(typeof dto.environmentId).toBe("string")
  })

  it("returns 404 for an unknown challenge slug", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/challenges/ghost/environments",
      ...auth(token),
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("CHALLENGE_NOT_FOUND")
  })

  it("is idempotent for a repeated Idempotency-Key", async () => {
    const headers = { origin: ORIGIN, "idempotency-key": "chal-key-1" }
    const first = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      headers,
      cookies: { [COOKIE]: token },
    })
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      headers,
      cookies: { [COOKIE]: token },
    })
    expect(first.json().data.environmentId).toBe(second.json().data.environmentId)
  })
})

describe("challenges — environment read & ownership", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("reads an owned environment", async () => {
    const token = await registerAndToken(app, "reader@example.com")
    const id = await createEnv(app, token)
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/challenges/${SLUG}/environments/${id}`,
      ...auth(token),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.environmentId).toBe(id)
  })

  it("returns 404 (not 403) for another user's environment (IDOR)", async () => {
    const owner = await registerAndToken(app, "owner2@example.com")
    const attacker = await registerAndToken(app, "attacker2@example.com")
    const id = await createEnv(app, owner)
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/challenges/${SLUG}/environments/${id}`,
      ...auth(attacker),
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("ENVIRONMENT_NOT_FOUND")
  })

  it("returns 400 when the environment belongs to a different challenge", async () => {
    const token = await registerAndToken(app, "mismatch@example.com")
    // Provision a MISSION environment directly, then try to read it as a challenge env.
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "MISSION", missionSlug: "surface-recon" },
    })
    const id = created.json().data.id
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/challenges/${SLUG}/environments/${id}`,
      ...auth(token),
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("ENVIRONMENT_CHALLENGE_MISMATCH")
  })
})

describe("challenges — reset", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("requires a session", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments/whatever/reset`,
      headers: { origin: ORIGIN },
    })
    expect(res.statusCode).toBe(401)
  })

  it("returns 409 when resetting a REQUESTED environment (no runtime)", async () => {
    const token = await registerAndToken(app, "reset@example.com")
    const id = await createEnv(app, token)
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments/${id}/reset`,
      ...auth(token),
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe("ENVIRONMENT_INVALID_STATE")
  })
})

describe("challenges — submission", () => {
  let app: FastifyInstance
  let token: string
  beforeEach(async () => {
    app = await newApp()
    token = await registerAndToken(app, "solver@example.com")
  })
  afterAll(async () => { await app.close() })

  it("requires a session", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      headers: { origin: ORIGIN },
      payload: { environmentId: "x", answer: "y" },
    })
    expect(res.statusCode).toBe(401)
  })

  it("enforces a trusted origin (CSRF)", async () => {
    const id = await createEnv(app, token)
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      headers: { origin: "http://evil.example" },
      cookies: { [COOKIE]: token },
      payload: { environmentId: id, answer: CORRECT_FLAG },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe("CSRF_ORIGIN_REJECTED")
  })

  it("rejects an invalid body with VALIDATION_ERROR", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { answer: "" },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("VALIDATION_ERROR")
  })

  it("returns a correct outcome with catalog points for the correct flag", async () => {
    const id = await createEnv(app, token)
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { environmentId: id, answer: CORRECT_FLAG },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({
      correct: true,
      alreadySolved: false,
      pointsAwarded: 100,
      totalPoints: 100,
    })
  })

  it("ignores a client-supplied points field (points come from the catalog)", async () => {
    const id = await createEnv(app, token)
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { environmentId: id, answer: CORRECT_FLAG, points: 999999 },
    })
    // Extra body fields are dropped by the zod schema; the award is the catalog's.
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({ pointsAwarded: 100, totalPoints: 100 })
  })

  it("returns a wrong outcome (no points) for a wrong flag", async () => {
    const id = await createEnv(app, token)
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { environmentId: id, answer: "CYVANTAS{nope}" },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({
      correct: false,
      alreadySolved: false,
      pointsAwarded: 0,
      totalPoints: 0,
    })
  })

  it("returns 404 when submitting against another user's environment", async () => {
    const id = await createEnv(app, token)
    const attacker = await registerAndToken(app, "thief@example.com")
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(attacker),
      payload: { environmentId: id, answer: CORRECT_FLAG },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("ENVIRONMENT_NOT_FOUND")
  })

  it("returns 400 when the environment is for a different challenge", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "MISSION", missionSlug: "surface-recon" },
    })
    const id = created.json().data.id
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { environmentId: id, answer: CORRECT_FLAG },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("ENVIRONMENT_CHALLENGE_MISMATCH")
  })

  it("never includes the flag in any response body", async () => {
    const id = await createEnv(app, token)
    const create = await app.inject({
      method: "GET",
      url: `/api/v1/challenges/${SLUG}/environments/${id}`,
      ...auth(token),
    })
    const detail = await app.inject({ method: "GET", url: `/api/v1/challenges/${SLUG}` })
    const submit = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { environmentId: id, answer: "guess" },
    })
    for (const res of [create, detail, submit]) {
      expect(res.body).not.toContain(CORRECT_FLAG)
      expect(res.body).not.toContain("CYVANTAS{")
    }
  })
})

describe("challenges — submission rate limiting", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("returns 429 once the per-user submit window is exhausted", async () => {
    const token = await registerAndToken(app, "flood@example.com")
    const id = await createEnv(app, token)
    let sawRateLimit = false
    // challengeSubmit rule is 15/min; a burst beyond that must trip 429.
    for (let i = 0; i < 20; i += 1) {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/challenges/${SLUG}/submit`,
        ...auth(token),
        payload: { environmentId: id, answer: "wrong" },
      })
      if (res.statusCode === 429) {
        expect(res.json().error.code).toBe("RATE_LIMITED")
        sawRateLimit = true
        break
      }
    }
    expect(sawRateLimit).toBe(true)
  })
})

describe("progress — server-authoritative read API", () => {
  let app: FastifyInstance
  beforeEach(async () => {
    app = await newApp()
  })
  afterAll(async () => { await app.close() })

  it("requires a session", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/progress" })
    expect(res.statusCode).toBe(401)
  })

  it("reflects a solve: totalPoints and solvedCount after a correct submit", async () => {
    const token = await registerAndToken(app, "progress@example.com")
    const id = await createEnv(app, token)
    await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      ...auth(token),
      payload: { environmentId: id, answer: CORRECT_FLAG },
    })
    const res = await app.inject({ method: "GET", url: "/api/v1/progress", ...auth(token) })
    expect(res.statusCode).toBe(200)
    const dto = res.json().data
    expect(dto.totalPoints).toBe(100)
    expect(dto.solvedCount).toBe(1)
    expect(dto.challenges).toEqual([
      expect.objectContaining({
        challengeSlug: SLUG,
        status: "completed",
        attempts: 1,
        pointsAwarded: 100,
      }),
    ])
    // The safe DTO never exposes the userId.
    expect(dto.challenges[0]).not.toHaveProperty("userId")
  })

  it("starts empty for a fresh account", async () => {
    const token = await registerAndToken(app, "fresh@example.com")
    const res = await app.inject({ method: "GET", url: "/api/v1/progress", ...auth(token) })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toEqual({ totalPoints: 0, solvedCount: 0, challenges: [] })
  })
})
