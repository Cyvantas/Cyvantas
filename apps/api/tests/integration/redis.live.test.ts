/**
 * LIVE Redis integration tests (Phase 18).
 *
 * These run ONLY when REDIS_URL is set (CI provisions a Redis service); they
 * skip on hosts without Redis. They exercise the SAME provider-neutral adapter
 * the deployment uses (createRedisSharedStateStore over a RedisLikeClient),
 * proving the store contract holds against a real broker — not a fake.
 *
 * Separation: this file contains ONLY live-Redis tests. In-memory unit coverage
 * of the same seam lives in tests/distributedLimits.test.ts (fake client).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createRedisSharedStateStore } from "../../src/infra/redisSharedStateStore.ts"
import type { SharedStateStore } from "../../src/infra/sharedState.ts"
import {
  connectRespClient,
  type RespTestClient,
} from "./support/respClient.ts"
import { hasRedis, REDIS_URL, uniqueSuffix } from "./support/harness.ts"

describe.skipIf(!hasRedis)("live Redis — SharedStateStore adapter", () => {
  let client: RespTestClient
  let store: SharedStateStore
  const p = `it:redis:${uniqueSuffix()}`

  beforeAll(async () => {
    client = await connectRespClient(REDIS_URL!)
    await client.flushdb()
    store = createRedisSharedStateStore(client)
  })
  afterAll(async () => {
    if (client) {
      await client.flushdb()
      await client.close()
    }
  })

  it("ping() resolves true against a real broker", async () => {
    expect(await store.ping()).toBe(true)
  })

  it("SET then GET round-trips a value", async () => {
    await store.set(`${p}:k`, "hello")
    expect(await store.get(`${p}:k`)).toBe("hello")
  })

  it("GET returns null for an absent key", async () => {
    expect(await store.get(`${p}:missing`)).toBeNull()
  })

  it("increment is atomic and returns the running total", async () => {
    expect(await store.increment(`${p}:c`)).toBe(1)
    expect(await store.increment(`${p}:c`, 4)).toBe(5)
  })

  it("delete removes a key", async () => {
    await store.set(`${p}:d`, "v")
    await store.delete(`${p}:d`)
    expect(await store.get(`${p}:d`)).toBeNull()
  })

  it("honors TTL: a key with a 1s expiry disappears", async () => {
    await store.set(`${p}:ttl`, "v", 1)
    expect(await store.get(`${p}:ttl`)).toBe("v")
    // Poll (bounded) until the real broker expires the key.
    const deadline = Date.now() + 3000
    let value: string | null = "v"
    while (Date.now() < deadline && value !== null) {
      await new Promise((r) => setTimeout(r, 150))
      value = await store.get(`${p}:ttl`)
    }
    expect(value).toBeNull()
  })

  it("expire() applies a TTL to an existing key", async () => {
    await store.set(`${p}:e`, "v")
    await store.expire(`${p}:e`, 1)
    const deadline = Date.now() + 3000
    let value: string | null = "v"
    while (Date.now() < deadline && value !== null) {
      await new Promise((r) => setTimeout(r, 150))
      value = await store.get(`${p}:e`)
    }
    expect(value).toBeNull()
  })

  it("atomic counter: N concurrent increments settle to exactly N", async () => {
    const key = `${p}:atomic`
    const N = 200
    await Promise.all(
      Array.from({ length: N }, () => store.increment(key, 1)),
    )
    expect(await store.get(key)).toBe(String(N))
  })
})
