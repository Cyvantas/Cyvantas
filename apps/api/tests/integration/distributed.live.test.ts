/**
 * LIVE distributed-state integration tests (Phase 18).
 *
 * Run ONLY when REDIS_URL is set. They prove the property that makes the
 * shared-state seam worth having: with a REAL Redis behind it, two independent
 * logical API instances enforce ONE global rate-limit / abuse-detection state
 * instead of drifting per-process counters.
 *
 * Two "instances" are modeled as two separate Redis-backed stores built from two
 * separate client connections to the SAME broker — exactly how two replicas in
 * production each hold their own client to one shared Redis.
 *
 * Repositories are in-memory here (this file validates the Redis-backed control
 * plane, not the database); the live-DB path is covered by postgres.live.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../src/app.ts"
import { createInMemoryRepositories } from "../../src/repositories/memory.ts"
import { createMemorySink } from "../../src/monitoring/sink.ts"
import { resolveSharedStateStore } from "../../src/infra/sharedStateFactory.ts"
import { createRedisSharedStateStore } from "../../src/infra/redisSharedStateStore.ts"
import { createSharedStateRateLimiter } from "../../src/security/rateLimiter.ts"
import { createSharedStateDetectionTracker } from "../../src/monitoring/detection.ts"
import type { SharedStateStore } from "../../src/infra/sharedState.ts"
import {
  connectRespClient,
  type RespTestClient,
} from "./support/respClient.ts"
import {
  hasRedis,
  integrationConfig,
  REDIS_URL,
  uniqueSuffix,
} from "./support/harness.ts"

const ORIGIN = "http://localhost:5173"

describe.skipIf(!hasRedis)("live distributed rate limiting / abuse detection", () => {
  let clientA: RespTestClient
  let clientB: RespTestClient
  let storeA: SharedStateStore
  let storeB: SharedStateStore

  beforeAll(async () => {
    clientA = await connectRespClient(REDIS_URL!)
    clientB = await connectRespClient(REDIS_URL!)
    await clientA.flushdb()
    storeA = createRedisSharedStateStore(clientA)
    storeB = createRedisSharedStateStore(clientB)
  })
  afterAll(async () => {
    if (clientA) {
      await clientA.flushdb()
      await clientA.close()
    }
    if (clientB) await clientB.close()
  })

  it("REDIS_URL selects a Redis-backed store via the Phase 17 factory", async () => {
    const store = resolveSharedStateStore(integrationConfig(), {
      redisClientFactory: () => clientA,
    })
    expect(await store.ping()).toBe(true)
    // A value written through the resolved store is visible in the real broker.
    const key = `factory:${uniqueSuffix()}`
    await store.set(key, "1", 10)
    expect(await clientA.get(key)).toBe("1")
  })

  it("counts a rate limit across two instances sharing one broker", async () => {
    const key = `rl:${uniqueSuffix()}`
    const rule = { limit: 3, windowMs: 60_000 }
    const a = createSharedStateRateLimiter(storeA)
    const b = createSharedStateRateLimiter(storeB)
    // Hits alternate between the two instances but share the same counter.
    expect((await a.check(key, rule)).allowed).toBe(true) // 1
    expect((await b.check(key, rule)).allowed).toBe(true) // 2
    expect((await a.check(key, rule)).allowed).toBe(true) // 3
    expect((await b.check(key, rule)).allowed).toBe(false) // 4 → over shared limit
  })

  it("trips abuse detection exactly once across two instances", async () => {
    const key = `det:${uniqueSuffix()}`
    const rule = { threshold: 3, windowMs: 60_000 }
    const a = createSharedStateDetectionTracker(storeA)
    const b = createSharedStateDetectionTracker(storeB)
    expect((await a.record(key, rule)).tripped).toBe(false) // 1
    expect((await b.record(key, rule)).tripped).toBe(false) // 2
    expect((await a.record(key, rule)).tripped).toBe(true) // 3 → trips
    expect((await b.record(key, rule)).tripped).toBe(false) // 4 → no re-trip
  })
})

describe.skipIf(!hasRedis)("two API instances enforce one shared rate limit (HTTP)", () => {
  let appA: FastifyInstance
  let appB: FastifyInstance
  let clientA: RespTestClient
  let clientB: RespTestClient

  async function buildInstance(client: RespTestClient): Promise<FastifyInstance> {
    const config = integrationConfig()
    const sharedState = resolveSharedStateStore(config, {
      redisClientFactory: () => client,
    })
    const app = await buildApp({
      config,
      sharedState,
      repositories: createInMemoryRepositories(),
      sink: createMemorySink(),
    })
    await app.ready()
    return app
  }

  beforeAll(async () => {
    clientA = await connectRespClient(REDIS_URL!)
    clientB = await connectRespClient(REDIS_URL!)
    await clientA.flushdb()
    appA = await buildInstance(clientA)
    appB = await buildInstance(clientB)
  })
  afterAll(async () => {
    if (appA) await appA.close()
    if (appB) await appB.close()
    if (clientA) {
      await clientA.flushdb()
      await clientA.close()
    }
    if (clientB) await clientB.close()
  })

  it("shares the per-IP register limit across both instances", async () => {
    // register is limited to RATE_RULES.register = 5 / hour per IP. Requests
    // alternate between the two instances; because both count into the same
    // Redis key for 127.0.0.1, the 6th request is rejected regardless of which
    // instance serves it — proving the counter is global, not per-process.
    const suffix = uniqueSuffix()
    const codes: number[] = []
    for (let i = 0; i < 6; i++) {
      const app = i % 2 === 0 ? appA : appB
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        headers: { origin: ORIGIN },
        payload: {
          email: `dist-${suffix}-${i}@example.com`,
          password: "correct horse battery staple",
          displayName: "Dist User",
        },
      })
      codes.push(res.statusCode)
    }
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(1)
    // A single-instance in-memory limiter could not have produced this: appB
    // observed hits that only appA served.
    expect(codes[5]).toBe(429)
  })
})
