/**
 * Distributed rate-limit / detection + Redis adapter tests (Phase 16).
 *
 * The rate limiter and detection tracker hold no state of their own — they read
 * and write counters through a SharedStateStore. These tests pin the two things
 * that make that seam valuable in production:
 *   1. Two limiters/trackers sharing ONE store behave as a single logical
 *      counter — i.e. the control is correct across horizontally-scaled
 *      replicas, not just within one process.
 *   2. The Redis adapter maps the store contract onto a Redis-compatible client
 *      correctly (atomic TTL on write, INCRBY, EXPIRE, DEL) and its ping() is
 *      bounded + fail-closed, never leaking a driver error.
 */
import { describe, it, expect } from "vitest"
import { createSharedStateRateLimiter } from "../src/security/rateLimiter.ts"
import { createSharedStateDetectionTracker } from "../src/monitoring/detection.ts"
import { createInMemorySharedStateStore } from "../src/infra/sharedState.ts"
import {
  createRedisSharedStateStore,
  type RedisLikeClient,
} from "../src/infra/redisSharedStateStore.ts"

describe("shared-state rate limiter", () => {
  it("counts across two limiters that share one store (multi-instance)", async () => {
    const t = 0
    const store = createInMemorySharedStateStore(() => t)
    const a = createSharedStateRateLimiter(store, () => t)
    const b = createSharedStateRateLimiter(store, () => t)
    const rule = { limit: 3, windowMs: 1000 }
    // Hits are split across "instances" a and b but share the same window.
    expect((await a.check("k", rule)).allowed).toBe(true) // 1
    expect((await b.check("k", rule)).allowed).toBe(true) // 2
    expect((await a.check("k", rule)).allowed).toBe(true) // 3
    expect((await b.check("k", rule)).allowed).toBe(false) // 4 → over the shared limit
  })

  it("reports remaining and resetAt for the current window", async () => {
    const t = 5_000
    const store = createInMemorySharedStateStore(() => t)
    const rl = createSharedStateRateLimiter(store, () => t)
    const rule = { limit: 5, windowMs: 1000 }
    const first = await rl.check("k", rule)
    expect(first.remaining).toBe(4)
    // windowStart = floor(5000/1000)*1000 = 5000; resetAt = 5000 + 1000.
    expect(first.resetAt).toBe(6000)
  })

  it("keeps separate windows for separate keys", async () => {
    const t = 0
    const store = createInMemorySharedStateStore(() => t)
    const rl = createSharedStateRateLimiter(store, () => t)
    const rule = { limit: 1, windowMs: 1000 }
    expect((await rl.check("a", rule)).allowed).toBe(true)
    expect((await rl.check("b", rule)).allowed).toBe(true)
    expect((await rl.check("a", rule)).allowed).toBe(false)
  })
})

describe("shared-state detection tracker", () => {
  it("trips once across two trackers sharing one store", async () => {
    const t = 0
    const store = createInMemorySharedStateStore(() => t)
    const a = createSharedStateDetectionTracker(store, () => t)
    const b = createSharedStateDetectionTracker(store, () => t)
    const rule = { threshold: 3, windowMs: 1000 }
    expect((await a.record("k", rule)).tripped).toBe(false) // 1
    expect((await b.record("k", rule)).tripped).toBe(false) // 2
    expect((await a.record("k", rule)).tripped).toBe(true) // 3 → trips once
    expect((await b.record("k", rule)).tripped).toBe(false) // 4 → no re-trip
  })
})

/** Minimal in-memory fake of the Redis command surface used by the adapter. */
function fakeRedis(overrides: Partial<RedisLikeClient> = {}): {
  client: RedisLikeClient
  store: Map<string, { value: string; ttl?: number }>
} {
  const store = new Map<string, { value: string; ttl?: number }>()
  const client: RedisLikeClient = {
    async get(key) {
      return store.get(key)?.value ?? null
    },
    async set(key, value, _mode, ttlSeconds) {
      store.set(key, { value, ttl: ttlSeconds })
      return "OK"
    },
    async incrby(key, by) {
      const current = Number(store.get(key)?.value ?? "0")
      const next = current + by
      store.set(key, { value: String(next), ttl: store.get(key)?.ttl })
      return next
    },
    async expire(key, ttlSeconds) {
      const entry = store.get(key)
      if (entry) entry.ttl = ttlSeconds
      return 1
    },
    async del(key) {
      store.delete(key)
      return 1
    },
    async ping() {
      return "PONG"
    },
    ...overrides,
  }
  return { client, store }
}

describe("redis shared-state adapter", () => {
  it("maps get/set/increment/expire/delete onto the client", async () => {
    const { client, store } = fakeRedis()
    const adapter = createRedisSharedStateStore(client)

    await adapter.set("k", "v")
    expect(await adapter.get("k")).toBe("v")

    expect(await adapter.increment("c")).toBe(1)
    expect(await adapter.increment("c", 2)).toBe(3)

    await adapter.expire("c", 42)
    expect(store.get("c")!.ttl).toBe(42)

    await adapter.delete("k")
    expect(await adapter.get("k")).toBeNull()
  })

  it("applies TTL atomically on set (SET ... EX ttl)", async () => {
    const calls: Array<unknown[]> = []
    const { client } = fakeRedis({
      async set(...args) {
        calls.push(args)
        return "OK"
      },
    })
    const adapter = createRedisSharedStateStore(client)
    await adapter.set("k", "v", 30)
    expect(calls[0]).toEqual(["k", "v", "EX", 30])
  })

  it("backs a working rate limiter", async () => {
    const t = 0
    const { client } = fakeRedis()
    const adapter = createRedisSharedStateStore(client)
    const rl = createSharedStateRateLimiter(adapter, () => t)
    const rule = { limit: 2, windowMs: 1000 }
    expect((await rl.check("k", rule)).allowed).toBe(true)
    expect((await rl.check("k", rule)).allowed).toBe(true)
    expect((await rl.check("k", rule)).allowed).toBe(false)
  })

  it("ping() resolves true on PONG", async () => {
    const { client } = fakeRedis()
    expect(await createRedisSharedStateStore(client).ping()).toBe(true)
  })

  it("ping() is fail-closed on a throwing client and never leaks the error", async () => {
    const { client } = fakeRedis({
      async ping() {
        throw new Error("redis://user:pass@host:6379 connection refused")
      },
    })
    expect(await createRedisSharedStateStore(client).ping()).toBe(false)
  })

  it("ping() is fail-closed on a non-PONG reply", async () => {
    const { client } = fakeRedis({
      async ping() {
        return "LOADING"
      },
    })
    expect(await createRedisSharedStateStore(client).ping()).toBe(false)
  })

  it("ping() is fail-closed on timeout", async () => {
    const { client } = fakeRedis({
      ping() {
        return new Promise<string>(() => {
          /* never resolves */
        })
      },
    })
    const adapter = createRedisSharedStateStore(client, { pingTimeoutMs: 10 })
    expect(await adapter.ping()).toBe(false)
  })
})
