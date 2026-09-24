import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
const COOKIE = config.sessionCookieName
const ORIGIN = "http://localhost:5173"
const PASSWORD = "correct horse battery"

function cookieValue(res: { cookies: Array<{ name: string; value: string }> }): string | undefined {
  return res.cookies.find((c) => c.name === COOKIE)?.value
}

// Each block gets a fresh app so the (intentionally strict) auth rate limiter
// and the in-memory store are isolated between test groups.
async function newApp(): Promise<FastifyInstance> {
  const app = await buildApp({ config, repositories: createInMemoryRepositories() })
  await app.ready()
  return app
}

function register(app: FastifyInstance, email: string) {
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin: ORIGIN },
    payload: { email, password: PASSWORD, displayName: "Test User" },
  })
}

describe("POST /auth/register", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("registers a new user, sets an HttpOnly session cookie, returns a safe DTO", async () => {
    const res = await register(app, "new@example.com")
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data).toMatchObject({ email: "new@example.com", displayName: "Test User", roles: ["USER"] })
    expect(body.data).not.toHaveProperty("passwordHash")
    const cookie = res.cookies.find((c) => c.name === COOKIE)
    expect(cookie).toBeDefined()
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite?.toLowerCase()).toBe("lax")
    expect(res.body).not.toContain(cookie!.value)
  })

  it("rejects a duplicate email generically (no 'email exists' disclosure)", async () => {
    await register(app, "dupe@example.com")
    const res = await register(app, "dupe@example.com")
    expect(res.statusCode).toBe(409)
    const body = res.json()
    expect(body.error.code).toBe("EMAIL_UNAVAILABLE")
    expect(body.error.message.toLowerCase()).not.toContain("exist")
  })

  it("rejects invalid email and weak password with VALIDATION_ERROR", async () => {
    const bad = await app.inject({
      method: "POST", url: "/api/v1/auth/register", headers: { origin: ORIGIN },
      payload: { email: "not-an-email", password: PASSWORD, displayName: "X" },
    })
    expect(bad.statusCode).toBe(400)
    expect(bad.json().error.code).toBe("VALIDATION_ERROR")

    const weak = await app.inject({
      method: "POST", url: "/api/v1/auth/register", headers: { origin: ORIGIN },
      payload: { email: "weak@example.com", password: "short", displayName: "X" },
    })
    expect(weak.statusCode).toBe(400)
    expect(weak.json().error.code).toBe("VALIDATION_ERROR")
  })
})

describe("POST /auth/login", () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await newApp()
    await register(app, "login@example.com")
  })
  afterAll(async () => { await app.close() })

  it("logs in with correct credentials and sets a cookie", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/login", headers: { origin: ORIGIN },
      payload: { email: "login@example.com", password: PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.email).toBe("login@example.com")
    expect(cookieValue(res)).toBeTruthy()
  })

  it("returns a generic 401 for a wrong password", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/login", headers: { origin: ORIGIN },
      payload: { email: "login@example.com", password: "totally wrong pass" },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toMatchObject({ code: "INVALID_CREDENTIALS", message: "Invalid email or password." })
  })

  it("returns the SAME generic 401 for an unknown email (no user enumeration)", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/login", headers: { origin: ORIGIN },
      payload: { email: "ghost@example.com", password: "totally wrong pass" },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toMatchObject({ code: "INVALID_CREDENTIALS", message: "Invalid email or password." })
  })
})

describe("GET /auth/me + logout", () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await newApp() })
  afterAll(async () => { await app.close() })

  it("401 without a session", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me" })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe("UNAUTHENTICATED")
  })

  it("returns the current user with a valid session, then 401 after logout", async () => {
    const reg = await register(app, "session@example.com")
    expect(reg.statusCode).toBe(201)
    const token = cookieValue(reg)!

    const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", cookies: { [COOKIE]: token } })
    expect(me.statusCode).toBe(200)
    expect(me.json().data.email).toBe("session@example.com")
    expect(me.body).not.toContain("passwordHash")

    const out = await app.inject({
      method: "POST", url: "/api/v1/auth/logout", headers: { origin: ORIGIN }, cookies: { [COOKIE]: token },
    })
    expect(out.statusCode).toBe(200)

    const after = await app.inject({ method: "GET", url: "/api/v1/auth/me", cookies: { [COOKIE]: token } })
    expect(after.statusCode).toBe(401)
  })

  it("rejects a bogus session cookie", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me", cookies: { [COOKIE]: "bogus" } })
    expect(res.statusCode).toBe(401)
  })
})

describe("CSRF origin enforcement", () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await newApp()
    await register(app, "csrf@example.com")
  })
  afterAll(async () => { await app.close() })

  it("rejects a state-changing request from a foreign Origin (before auth logic)", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/auth/login", headers: { origin: "http://evil.example" },
      payload: { email: "csrf@example.com", password: PASSWORD },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe("CSRF_ORIGIN_REJECTED")
  })
})

describe("rate limiting", () => {
  it("returns 429 once the registration limit is exceeded", async () => {
    const app = await newApp()
    let last = 200
    for (let i = 0; i < 8; i++) {
      const res = await app.inject({
        method: "POST", url: "/api/v1/auth/register", headers: { origin: ORIGIN },
        payload: { email: `rl${i}@example.com`, password: PASSWORD, displayName: "RL" },
      })
      last = res.statusCode
      if (last === 429) break
    }
    expect(last).toBe(429)
    await app.close()
  })
})
