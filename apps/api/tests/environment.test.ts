import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
const COOKIE = config.sessionCookieName
const ORIGIN = "http://localhost:5173"
const PASSWORD = "correct horse battery"
const CHALLENGE = "reflected-xss"
const MISSION = "surface-recon"

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
    payload: { email, password: PASSWORD, displayName: "Env User" },
  })
  return cookieValue(res)
}

function auth(token: string) {
  return { headers: { origin: ORIGIN }, cookies: { [COOKIE]: token } }
}

describe("environments — authentication", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("requires a session to create", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      headers: { origin: ORIGIN },
      payload: { type: "CHALLENGE", challengeSlug: CHALLENGE },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe("UNAUTHENTICATED")
  })

  it("requires a session to list", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/environments" })
    expect(res.statusCode).toBe(401)
  })
})

describe("environments — create & safe DTO", () => {
  let app: FastifyInstance
  let token: string
  beforeEach(async () => {
    app = await newApp()
    token = await registerAndToken(app, "creator@example.com")
  })
  afterAll(async () => { await app.close() })

  it("creates an environment and returns only safe fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "CHALLENGE", challengeSlug: CHALLENGE },
    })
    expect(res.statusCode).toBe(201)
    const dto = res.json().data
    expect(dto).toMatchObject({
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
      status: "REQUESTED",
      runtimeStatus: "NOT_PROVISIONED",
      runtimeConfigured: false,
    })
    // Internal fields are never exposed.
    expect(dto).not.toHaveProperty("userId")
    expect(dto).not.toHaveProperty("metadata")
    expect(dto).not.toHaveProperty("failureMessage")
    expect(typeof dto.id).toBe("string")
    expect(typeof dto.expiresAt).toBe("string")
  })

  it("rejects an invalid body with VALIDATION_ERROR", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "NONSENSE" },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("VALIDATION_ERROR")
  })

  it("rejects an unknown catalog target with INVALID_ENVIRONMENT_TARGET", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "CHALLENGE", challengeSlug: "ghost-challenge" },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("INVALID_ENVIRONMENT_TARGET")
  })

  it("ignores a spoofed userId in the body (actor comes from the session)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "MISSION", missionSlug: MISSION, userId: "victim" },
    })
    expect(res.statusCode).toBe(201)
    // The env is owned by the session user; verify it appears in that user's list.
    const list = await app.inject({ method: "GET", url: "/api/v1/environments", ...auth(token) })
    expect(list.json().data).toHaveLength(1)
  })

  it("enforces a trusted origin on create (CSRF)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      headers: { origin: "http://evil.example" },
      cookies: { [COOKIE]: token },
      payload: { type: "CHALLENGE", challengeSlug: CHALLENGE },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe("CSRF_ORIGIN_REJECTED")
  })
})

describe("environments — ownership (IDOR)", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("returns 404 (not 403) when another user reads or mutates an environment", async () => {
    const owner = await registerAndToken(app, "owner@example.com")
    const attacker = await registerAndToken(app, "attacker@example.com")
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(owner),
      payload: { type: "CHALLENGE", challengeSlug: CHALLENGE },
    })
    const id = created.json().data.id

    const read = await app.inject({ method: "GET", url: `/api/v1/environments/${id}`, ...auth(attacker) })
    expect(read.statusCode).toBe(404)
    expect(read.json().error.code).toBe("ENVIRONMENT_NOT_FOUND")

    const destroy = await app.inject({ method: "DELETE", url: `/api/v1/environments/${id}`, ...auth(attacker) })
    expect(destroy.statusCode).toBe(404)

    // The owner can still see it — proof the attacker's 404 was authorization.
    const ownerRead = await app.inject({ method: "GET", url: `/api/v1/environments/${id}`, ...auth(owner) })
    expect(ownerRead.statusCode).toBe(200)
  })
})

describe("environments — lifecycle over HTTP", () => {
  let app: FastifyInstance
  let token: string
  let id: string
  beforeAll(async () => {
    app = await newApp()
    token = await registerAndToken(app, "lifecycle@example.com")
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/environments",
      ...auth(token),
      payload: { type: "CHALLENGE", challengeSlug: CHALLENGE },
    })
    id = created.json().data.id
  })
  afterAll(async () => { await app.close() })

  it("start moves the environment to ACTIVE without claiming a runtime", async () => {
    const res = await app.inject({ method: "POST", url: `/api/v1/environments/${id}/start`, ...auth(token) })
    expect(res.statusCode).toBe(200)
    const dto = res.json().data
    expect(dto.status).toBe("ACTIVE")
    expect(dto.runtimeStatus).toBe("NOT_PROVISIONED")
    expect(dto.runtimeConfigured).toBe(false)
  })

  it("touch keeps the environment alive", async () => {
    const res = await app.inject({ method: "POST", url: `/api/v1/environments/${id}/touch`, ...auth(token) })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe("ACTIVE")
  })

  it("stop returns it to READY", async () => {
    const res = await app.inject({ method: "POST", url: `/api/v1/environments/${id}/stop`, ...auth(token) })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe("READY")
  })

  it("reset keeps it at READY", async () => {
    const res = await app.inject({ method: "POST", url: `/api/v1/environments/${id}/reset`, ...auth(token) })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe("READY")
  })

  it("destroy is terminal and idempotent", async () => {
    const first = await app.inject({ method: "DELETE", url: `/api/v1/environments/${id}`, ...auth(token) })
    expect(first.statusCode).toBe(200)
    expect(first.json().data.status).toBe("DESTROYED")
    const again = await app.inject({ method: "DELETE", url: `/api/v1/environments/${id}`, ...auth(token) })
    expect(again.statusCode).toBe(200)
    expect(again.json().data.status).toBe("DESTROYED")
  })

  it("cannot start a destroyed environment", async () => {
    const res = await app.inject({ method: "POST", url: `/api/v1/environments/${id}/start`, ...auth(token) })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe("ENVIRONMENT_INVALID_STATE")
  })
})

describe("environments — idempotent creation over HTTP", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("returns the same environment for a repeated Idempotency-Key", async () => {
    const token = await registerAndToken(app, "idem@example.com")
    const payload = { type: "CHALLENGE", challengeSlug: CHALLENGE }
    const headers = { origin: ORIGIN, "idempotency-key": "key-123" }
    const first = await app.inject({ method: "POST", url: "/api/v1/environments", headers, cookies: { [COOKIE]: token }, payload })
    const second = await app.inject({ method: "POST", url: "/api/v1/environments", headers, cookies: { [COOKIE]: token }, payload })
    expect(first.json().data.id).toBe(second.json().data.id)
    const list = await app.inject({ method: "GET", url: "/api/v1/environments", ...auth(token) })
    expect(list.json().data).toHaveLength(1)
  })
})

