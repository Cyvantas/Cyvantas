/**
 * Redis-backed `SharedStateStore` adapter.
 *
 * ## Why this ships no `redis` dependency
 *
 * The repository is deliberately provider-neutral (see src/infra/sharedState.ts
 * and docs/PRODUCTION-INFRASTRUCTURE.md → Redis): it must build and test on any
 * host — including Termux/aarch64, where a native Redis client cannot run — and
 * must not pin an operator to `ioredis` vs `node-redis`. So instead of importing
 * a client, this adapter accepts one that satisfies the tiny `RedisLikeClient`
 * command surface below. Both `ioredis` and `node-redis` expose exactly these
 * commands, so wiring is a one-liner at the deployment edge:
 *
 *   import Redis from "ioredis"
 *   const store = createRedisSharedStateStore(new Redis(config.redisUrl))
 *   const app = await buildApp({ sharedState: store })
 *
 * The adapter itself performs NO direct network/socket/fs access and imports no
 * Node networking module — all I/O is delegated to the injected client. That is
 * what keeps the seam testable with an in-memory fake and clean under the
 * forbidden-import security scan.
 *
 * ## Command mapping
 *
 *   get       → GET
 *   set       → SET key val [EX ttl]   (atomic TTL on write)
 *   increment → INCRBY key by; on the first hit the caller sets EXPIRE
 *   expire    → EXPIRE key ttl
 *   delete    → DEL key
 *   ping      → PING, bounded + fail-closed (resolves false on error/timeout)
 *
 * `ping()` NEVER surfaces the connection string or a raw driver error — it only
 * ever resolves a boolean, matching the SharedStateStore contract used by the
 * readiness probe.
 */
import type { SharedStateStore } from "./sharedState.ts"

/**
 * Minimal Redis command surface required by the adapter. Any client that
 * implements these (ioredis, node-redis, a test fake) can back the store.
 * Kept intentionally narrow: no pipelines, transactions, pub/sub, or scans.
 */
export interface RedisLikeClient {
  get(key: string): Promise<string | null>
  /**
   * SET with an optional expiry. When `mode`/`ttlSeconds` are supplied the
   * client MUST apply the TTL atomically (`SET key val EX ttl`).
   */
  set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<unknown>
  incrby(key: string, by: number): Promise<number>
  expire(key: string, ttlSeconds: number): Promise<unknown>
  del(key: string): Promise<unknown>
  ping(): Promise<string>
}

/** Default bound for the readiness connectivity check. */
const DEFAULT_PING_TIMEOUT_MS = 1000

export interface RedisSharedStateOptions {
  /** Bound (ms) for `ping()`. A slow broker must not stall readiness. */
  pingTimeoutMs?: number
}

/**
 * Adapt an injected Redis-compatible client to the `SharedStateStore` contract.
 * The adapter is a thin, stateless translation layer; correctness of atomicity
 * and TTL depends on the underlying server, exactly as documented in
 * sharedState.ts → "Production adapter contract".
 */
export function createRedisSharedStateStore(
  client: RedisLikeClient,
  options: RedisSharedStateOptions = {},
): SharedStateStore {
  const pingTimeoutMs = options.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS

  return {
    async get(key) {
      return client.get(key)
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds !== undefined) {
        await client.set(key, value, "EX", ttlSeconds)
      } else {
        await client.set(key, value)
      }
    },
    async increment(key, by = 1) {
      return client.incrby(key, by)
    },
    async expire(key, ttlSeconds) {
      await client.expire(key, ttlSeconds)
    },
    async delete(key) {
      await client.del(key)
    },
    async ping() {
      // Bounded + fail-closed: a hung or erroring broker resolves false and
      // never leaks the connection string or a driver error to the caller.
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error("ping timeout")), pingTimeoutMs)
        })
        const reply = await Promise.race([client.ping(), timeout])
        return reply === "PONG"
      } catch {
        return false
      }
    },
  }
}
