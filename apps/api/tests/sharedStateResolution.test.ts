/**
 * Shared-state resolution + fail-closed enforcement tests (Phase 17).
 *
 * Phase 16 made the limiter/detection async over a SharedStateStore and shipped
 * a Redis adapter. Phase 17 adds the deployment-boundary SELECTION and proves it
 * is provider-neutral and fail-closed:
 *   - REDIS_URL unset            → in-memory store (dev/test/single-instance).
 *   - REDIS_URL set + factory     → Redis-backed store built from the operator's
 *                                   injected client (no provider shipped here).
 *   - REDIS_URL set + no factory  → boot refused (never a silent per-process
 *                                   fallback), and the error leaks no URL.
 * Plus: the enforcement path stays FAIL-CLOSED when the backing store errors,
 * and increments are atomic under concurrency.
 */
import { describe, it, expect } from "vitest"
import {
  resolveSharedStateStore,
  SharedStateConfigError,
} from "../src/infra/sharedStateFactory.ts"
import type { RedisLikeClient } from "../src/infra/redisSharedStateStore.ts"
import { createInMemorySharedStateStore } from "../src/infra/sharedState.ts"
import { createSharedStateRateLimiter } from "../src/security/rateLimiter.ts"
import { evaluateAbuseChecks } from "../src/security/abuseGuard.ts"

/** Minimal in-memory fake of the Redis command surface used by the adapter. */
function fakeRedis(): RedisLikeClient {
  const store = new Map<string, string>()
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, value) {
      store.set(key, value)
      return "OK"
    },
    async incrby(key, by) {
      const next = Number(store.get(key) ?? "0") + by
      store.set(key, String(next))
      return next
    },
    async expire() {
      return 1
    },
    async del(key) {
      store.delete(key)
      return 1
    },
    async ping() {
      return "PONG"
    },
  }
}

describe("resolveSharedStateStore (deployment boundary)", () => {
  it("returns an in-memory store when REDIS_URL is unset", async () => {
    const store = resolveSharedStateStore({ redisUrl: undefined })
    await store.set("k", "v")
    expect(await store.get("k")).toBe("v")
    expect(await store.ping()).toBe(true)
  })

  it("returns a Redis-backed store when REDIS_URL is set and a factory is injected", async () => {
    let receivedUrl: string | undefined
    const store = resolveSharedStateStore(
      { redisUrl: "rediss://user:pass@host:6379" },
      {
        redisClientFactory: (url) => {
          receivedUrl = url
          return fakeRedis()
        },
      },
    )
    // The factory is what receives the URL — never logged, never elsewhere.
    expect(receivedUrl).toBe("rediss://user:pass@host:6379")
    expect(await store.increment("c")).toBe(1)
    expect(await store.increment("c", 2)).toBe(3)
    expect(await store.ping()).toBe(true)
  })

  it("backs a working, shared rate limiter when Redis-backed", async () => {
    const t = 0
    const store = resolveSharedStateStore(
      { redisUrl: "redis://host:6379" },
      { redisClientFactory: () => fakeRedis() },
    )
    // Two "instances" over the same injected client share one counter.
    const a = createSharedStateRateLimiter(store, () => t)
    const b = createSharedStateRateLimiter(store, () => t)
    const rule = { limit: 2, windowMs: 1000 }
    expect((await a.check("k", rule)).allowed).toBe(true)
    expect((await b.check("k", rule)).allowed).toBe(true)
    expect((await a.check("k", rule)).allowed).toBe(false)
  })

  it("fails closed: throws when REDIS_URL is set but no client is wired", () => {
    expect(() =>
      resolveSharedStateStore({ redisUrl: "rediss://user:pass@host:6379" }),
    ).toThrow(SharedStateConfigError)
  })

  it("the fail-closed error never leaks the connection string", () => {
    const secretUrl = "rediss://admin:s3cr3t@prod-host:6379/0"
    try {
      resolveSharedStateStore({ redisUrl: secretUrl })
      throw new Error("expected resolveSharedStateStore to throw")
    } catch (err) {
      expect(err).toBeInstanceOf(SharedStateConfigError)
      const message = (err as Error).message
      expect(message).not.toContain(secretUrl)
      expect(message).not.toContain("s3cr3t")
      expect(message).not.toContain("prod-host")
    }
  })
})

describe("enforcement stays fail-closed when the store errors", () => {
  it("evaluateAbuseChecks denies when the backing store's increment rejects", async () => {
    // Simulate a shared-store outage: increment rejects. A store error must be
    // treated as a DENIAL, never an allow.
    const failing = createInMemorySharedStateStore()
    failing.increment = async () => {
      throw new Error("redis://user:pass@host:6379 connection reset")
    }
    const limiter = createSharedStateRateLimiter(failing)
    const denied = await evaluateAbuseChecks(limiter, [
      { scope: "test:user", key: "user:1", rule: { limit: 5, windowMs: 1000 } },
    ])
    expect(denied).not.toBeNull()
    expect(denied?.scope).toBe("test:user")
  })
})

describe("increment atomicity under concurrency", () => {
  it("counts every concurrent hit exactly once (in-memory store)", async () => {
    const store = createInMemorySharedStateStore()
    const hits = 50
    const results = await Promise.all(
      Array.from({ length: hits }, () => store.increment("c")),
    )
    // Every increment returns a distinct value 1..hits, and the final value is
    // exactly the number of hits — no lost updates.
    expect(await store.get("c")).toBe(String(hits))
    expect(new Set(results).size).toBe(hits)
    expect(Math.max(...results)).toBe(hits)
  })
})
