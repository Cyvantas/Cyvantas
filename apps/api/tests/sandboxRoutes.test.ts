import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
const COOKIE = config.sessionCookieName
const ORIGIN = "http://localhost:5173"
const PASSWORD = "correct horse battery"
const CHALLENGE = "reflected-xss"

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
    payload: { email, password: PASSWORD, displayName: "Sandbox User" },
  })
  return cookieValue(res)
}

function auth(token: string) {
  return { headers: { origin: ORIGIN }, cookies: { [COOKIE]: token } }
}

async function createEnv(app: FastifyInstance, token: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/environments",
    ...auth(token),
    payload: { type: "CHALLENGE", challengeSlug: CHALLENGE },
  })
  return res.json().data.id
}

describe("sandbox routes — authentication & ownership", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("requires a session to describe a sandbox", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/environments/env-x/sandbox" })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe("UNAUTHENTICATED")
  })

  it("requires a session to provision a sandbox", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/environments/env-x/sandbox/provision",
      headers: { origin: ORIGIN },
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })

  it("returns 404 (not 403) when another user describes a sandbox (IDOR)", async () => {
    const owner = await registerAndToken(app, "owner@example.com")
    const attacker = await registerAndToken(app, "attacker@example.com")
    const id = await createEnv(app, owner)
    const res = await app.inject({ method: "GET", url: `/api/v1/environments/${id}/sandbox`, ...auth(attacker) })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("ENVIRONMENT_NOT_FOUND")
  })
})

describe("sandbox routes — describe (safe DTO, no runtime)", () => {
  let app: FastifyInstance
  let token: string
  let id: string
  beforeAll(async () => {
    app = await newApp()
    token = await registerAndToken(app, "describe@example.com")
    id = await createEnv(app, token)
  })
  afterAll(async () => { await app.close() })

  it("returns the conservative default policy with runtimeAvailable=false", async () => {
    const res = await app.inject({ method: "GET", url: `/api/v1/environments/${id}/sandbox`, ...auth(token) })
    expect(res.statusCode).toBe(200)
    const d = res.json().data
    expect(d.environmentId).toBe(id)
    expect(d.runtimeAvailable).toBe(false)
    expect(d.policy.network.ingress).toBe("deny")
    expect(d.policy.network.egress).toBe("deny")
    expect(d.policy.network.allowedDestinationCount).toBe(0)
    expect(d.policy.capabilities.allowPrivileged).toBe(false)
    expect(d.policy.filesystem.readOnlyRootFilesystem).toBe(true)
  })

  it("never leaks internal fields (userId, metadata, destinations)", async () => {
    const res = await app.inject({ method: "GET", url: `/api/v1/environments/${id}/sandbox`, ...auth(token) })
    const serialized = JSON.stringify(res.json().data)
    expect(serialized).not.toContain("userId")
    expect(serialized).not.toContain("metadata")
    expect(serialized).not.toContain("allowedDestinations\"")
  })
})

describe("sandbox routes — provision (honest runtime-unavailable)", () => {
  let app: FastifyInstance
  let token: string
  let id: string
  beforeAll(async () => {
    app = await newApp()
    token = await registerAndToken(app, "provision@example.com")
    id = await createEnv(app, token)
  })
  afterAll(async () => { await app.close() })

  it("returns 503 SANDBOX_RUNTIME_UNAVAILABLE — never fakes a running sandbox", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/environments/${id}/sandbox/provision`,
      ...auth(token),
      payload: {},
    })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe("SANDBOX_RUNTIME_UNAVAILABLE")
  })

  it("rejects an unsafe policy with 422 before touching any runtime", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/environments/${id}/sandbox/provision`,
      ...auth(token),
      payload: { capabilities: { allowPrivileged: true } },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe("SANDBOX_POLICY_REJECTED")
  })

  it("enforces a trusted origin on provision (CSRF)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/environments/${id}/sandbox/provision`,
      headers: { origin: "http://evil.example" },
      cookies: { [COOKIE]: token },
      payload: {},
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe("CSRF_ORIGIN_REJECTED")
  })

  it("rejects a malformed body with VALIDATION_ERROR", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/environments/${id}/sandbox/provision`,
      ...auth(token),
      payload: { resources: { cpuMillis: "lots" } },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 404 when provisioning an environment the caller does not own", async () => {
    const attacker = await registerAndToken(app, "prov-attacker@example.com")
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/environments/${id}/sandbox/provision`,
      ...auth(attacker),
      payload: {},
    })
    expect(res.statusCode).toBe(404)
  })
})
