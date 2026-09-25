/**
 * Production hardening regression tests (Phase 14).
 *
 * Two guarantees introduced by the hardening pass:
 *  1. CONFIG FAIL-CLOSED — in production the config loader refuses unsafe or
 *     missing security-critical values (wildcard/absent/http/loopback CORS,
 *     missing DATABASE_URL) rather than silently falling back to dev defaults.
 *  2. SECURITY HEADERS — every HTTP response (success, error envelope, and
 *     404) carries the baseline hardening headers, and the correlation id only
 *     honors an inbound value that matches a safe charset.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { loadConfig } from "../src/config/env.ts"
import { buildApp } from "../src/app.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"
import { createMemorySink } from "../src/monitoring/sink.ts"

const PROD_DB = "postgresql://user:pass@db.internal:5432/cyvantas"

describe("config — production CORS fail-closed", () => {
  it("throws when CORS_ORIGIN is absent in production", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "production", DATABASE_URL: PROD_DB }),
    ).toThrow(/CORS_ORIGIN is required in production/)
  })

  it("throws on a non-https origin in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: PROD_DB,
        CORS_ORIGIN: "http://lab.cyvantas.in",
      }),
    ).toThrow(/https/)
  })

  it("throws on a loopback origin in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: PROD_DB,
        CORS_ORIGIN: "https://localhost",
      }),
    ).toThrow(/loopback/)
  })

  it("throws on a wildcard origin in any environment", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "development", CORS_ORIGIN: "*" }),
    ).toThrow(/Wildcard/)
  })

  it("accepts an explicit https origin in production", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: PROD_DB,
      CORS_ORIGIN: "https://lab.cyvantas.in",
    })
    expect(config.corsOrigin).toEqual(["https://lab.cyvantas.in"])
    expect(config.cookieSecure).toBe(true)
  })

  it("requires DATABASE_URL in production", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "production", CORS_ORIGIN: "https://lab.cyvantas.in" }),
    ).toThrow(/DATABASE_URL is required/)
  })

  it("falls back to a localhost origin outside production", () => {
    const config = loadConfig({ NODE_ENV: "test" })
    expect(config.corsOrigin).toEqual(["http://localhost:5173"])
    expect(config.cookieSecure).toBe(false)
  })
})

describe("security response headers", () => {
  const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildApp({
      config,
      repositories: createInMemoryRepositories(),
      sink: createMemorySink(),
    })
    await app.ready()
  })
  afterEach(async () => {
    await app.close()
  })

  const HEADERS: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cross-origin-resource-policy": "same-origin",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  }

  it("sets baseline hardening headers on a successful response", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/challenges" })
    for (const [name, value] of Object.entries(HEADERS)) {
      expect(res.headers[name]).toBe(value)
    }
  })

  it("sets the same headers on a 404 response", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/nope" })
    expect(res.statusCode).toBe(404)
    for (const [name, value] of Object.entries(HEADERS)) {
      expect(res.headers[name]).toBe(value)
    }
  })

  it("does not emit HSTS outside production", async () => {
    const res = await app.inject({ method: "GET", url: "/health" })
    expect(res.headers["strict-transport-security"]).toBeUndefined()
  })

  it("mints a request id when the inbound value has an unsafe charset", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges",
      headers: { "x-request-id": "bad id\r\nInjected: 1" },
    })
    expect(res.headers["x-request-id"]).not.toContain("Injected")
    expect(res.headers["x-request-id"]).not.toBe("bad id\r\nInjected: 1")
  })
})
