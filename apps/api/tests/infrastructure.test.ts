/**
 * Production-infrastructure readiness tests (Phase 15).
 *
 * Covers the liveness/readiness split, the readiness service's bounded +
 * fail-closed + non-leaky behavior, CORS origin rejection, optional REDIS_URL
 * validation, and that no real secret lives in the config example. Everything
 * uses in-memory fakes — no real PostgreSQL, Redis, Docker, or network.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { FastifyInstance } from "fastify"
import { loadConfig } from "../src/config/env.ts"
import { buildApp } from "../src/app.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"
import { createMemorySink } from "../src/monitoring/sink.ts"
import {
  createReadinessService,
  type ReadinessService,
} from "../src/health/readiness.ts"
import { createInMemorySharedStateStore } from "../src/infra/sharedState.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })

async function makeApp(readiness?: ReadinessService): Promise<FastifyInstance> {
  const app = await buildApp({
    config,
    repositories: createInMemoryRepositories(),
    sink: createMemorySink(),
    readiness,
  })
  await app.ready()
  return app
}

const okProbe = (name: string) => ({ name, check: async () => true })
const failProbe = (name: string) => ({ name, check: async () => false })

describe("GET /ready", () => {
  let app: FastifyInstance
  afterEach(async () => {
    if (app) await app.close()
  })

  it("returns 200 ready with the default (in-memory) probes", async () => {
    app = await makeApp()
    const res = await app.inject({ method: "GET", url: "/ready" })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      data: { status: "ready", checks: { database: "ok", sharedState: "ok" } },
    })
  })

  it("requires no authentication", async () => {
    app = await makeApp()
    const res = await app.inject({ method: "GET", url: "/ready" })
    expect(res.statusCode).toBe(200)
  })

  it("returns 503 not_ready when the database probe fails", async () => {
    app = await makeApp(
      createReadinessService([failProbe("database"), okProbe("sharedState")]),
    )
    const res = await app.inject({ method: "GET", url: "/ready" })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({
      data: {
        status: "not_ready",
        checks: { database: "unavailable", sharedState: "ok" },
      },
    })
  })

  it("returns 503 not_ready when the shared-state probe fails", async () => {
    app = await makeApp(
      createReadinessService([okProbe("database"), failProbe("sharedState")]),
    )
    const res = await app.inject({ method: "GET", url: "/ready" })
    expect(res.statusCode).toBe(503)
    expect(res.json().data.checks.sharedState).toBe("unavailable")
  })

  it("never leaks a raw dependency error or connection string", async () => {
    const secret = "postgresql://user:sup3rs3cret@db.internal:5432/cyvantas"
    app = await makeApp(
      createReadinessService([
        {
          name: "database",
          check: async () => {
            throw new Error(`connection refused: ${secret}`)
          },
        },
        okProbe("sharedState"),
      ]),
    )
    const res = await app.inject({ method: "GET", url: "/ready" })
    expect(res.statusCode).toBe(503)
    expect(res.payload).not.toContain("sup3rs3cret")
    expect(res.payload).not.toContain("postgresql://")
    expect(res.json().data.checks.database).toBe("unavailable")
  })
})

describe("readiness service (unit)", () => {
  it("treats a hung probe as unavailable within the timeout bound", async () => {
    const service = createReadinessService(
      [{ name: "database", check: () => new Promise<boolean>(() => {}) }],
      { timeoutMs: 30 },
    )
    const report = await service.check()
    expect(report.ready).toBe(false)
    expect(report.checks.database).toBe("unavailable")
  })

  it("treats a rejected probe as unavailable and stays ready otherwise", async () => {
    const service = createReadinessService([
      { name: "a", check: async () => true },
      { name: "b", check: async () => Promise.reject(new Error("boom")) },
    ])
    const report = await service.check()
    expect(report.ready).toBe(false)
    expect(report.checks).toEqual({ a: "ok", b: "unavailable" })
  })

  it("reports ready when every probe passes", async () => {
    const service = createReadinessService([okProbe("a"), okProbe("b")])
    expect(await service.check()).toEqual({
      ready: true,
      checks: { a: "ok", b: "ok" },
    })
  })
})

describe("shared-state in-memory store", () => {
  it("supports get/set/increment/expire/delete and always pings ready", async () => {
    let clock = 0
    const store = createInMemorySharedStateStore(() => clock)
    expect(await store.ping()).toBe(true)
    await store.set("k", "v", 1)
    expect(await store.get("k")).toBe("v")
    clock = 2000 // past the 1s TTL
    expect(await store.get("k")).toBeNull()
    expect(await store.increment("c")).toBe(1)
    expect(await store.increment("c", 4)).toBe(5)
    await store.delete("c")
    expect(await store.get("c")).toBeNull()
  })
})

describe("CORS origin allow-list", () => {
  let app: FastifyInstance
  beforeEach(async () => {
    app = await makeApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it("echoes an approved origin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges",
      headers: { origin: "http://localhost:5173" },
    })
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173")
  })

  it("does not echo an unapproved origin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges",
      headers: { origin: "https://evil.example" },
    })
    expect(res.headers["access-control-allow-origin"]).toBeUndefined()
  })
})

describe("config — optional REDIS_URL", () => {
  it("is undefined when unset", () => {
    expect(loadConfig({ NODE_ENV: "test" }).redisUrl).toBeUndefined()
  })

  it("accepts a rediss:// URL", () => {
    const c = loadConfig({ NODE_ENV: "test", REDIS_URL: "rediss://h:6379" })
    expect(c.redisUrl).toBe("rediss://h:6379")
  })

  it("rejects a non-redis scheme", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "test", REDIS_URL: "http://h:6379" }),
    ).toThrow(/REDIS_URL must use the redis/)
  })
})

describe("no-secret-leak guarantees", () => {
  it("GET /health exposes only status/service/version, no connection string", async () => {
    const app = await makeApp()
    const res = await app.inject({ method: "GET", url: "/health" })
    await app.close()
    expect(Object.keys(res.json().data).sort()).toEqual([
      "service",
      "status",
      "version",
    ])
    expect(res.payload).not.toMatch(/postgres|redis:\/\/|password|secret/i)
  })

  it(".env.example contains only placeholder secrets", () => {
    const path = fileURLToPath(new URL("../.env.example", import.meta.url))
    const text = readFileSync(path, "utf8")
    // The DB URL is a placeholder, not a real credential.
    expect(text).toContain("postgresql://USER:PASSWORD@HOST:5432/cyvantas")
    expect(text).not.toContain("PRIVATE KEY")
    // No line assigns a concrete-looking secret to REDIS_URL (the example line
    // is commented and uses placeholder USER:PASSWORD).
    const activeRedis = text
      .split("\n")
      .find((l) => /^\s*REDIS_URL=/.test(l))
    expect(activeRedis).toBeUndefined()
  })
})
