/**
 * Provider-neutral shared-state store.
 *
 * A small key/value interface for state that MUST be shared across API
 * instances in a horizontally-scaled deployment — most importantly the rate
 * limiter and abuse-detection counters, which are per-process today (see
 * src/security/rateLimiter.ts and docs/ABUSE-CONTROLS.md).
 *
 * ## Why an interface (and not a Redis dependency)
 *
 * This repository ships ONLY the in-memory implementation below. It is correct
 * for local development, tests, and a genuine single-instance deployment. It is
 * NOT shared across processes, so it does NOT provide horizontal scalability.
 *
 * A multi-instance production deployment must supply a Redis-compatible adapter
 * implementing `SharedStateStore`. We deliberately do not install a Redis client
 * or assume a provider — the seam keeps the code provider-neutral until an
 * operator selects one. See docs/PRODUCTION-INFRASTRUCTURE.md → Redis.
 *
 * ## Production adapter contract
 *
 * An implementation backed by a Redis-compatible server MUST:
 *   - map each method to the obvious command (`GET`, `SET`, `INCR`, `EXPIRE`,
 *     `DEL`, `PING`);
 *   - honor `ttlSeconds` atomically on `set` (e.g. `SET key val EX ttl`) and via
 *     `EXPIRE` on `expire`/`increment`;
 *   - implement `ping()` as a bounded, fail-closed connectivity check that
 *     resolves `false` on error/timeout and NEVER surfaces the connection string
 *     or a raw driver error;
 *   - never log credentials or the connection URL.
 */

/** Backend-agnostic shared key/value store for cross-instance counters. */
export interface SharedStateStore {
  /** Current value, or null if absent/expired. */
  get(key: string): Promise<string | null>
  /** Set a value with an optional TTL (seconds). */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  /** Atomically add `by` (default 1) and return the new value. */
  increment(key: string, by?: number): Promise<number>
  /** (Re)set the TTL (seconds) on an existing key. No-op if absent. */
  expire(key: string, ttlSeconds: number): Promise<void>
  /** Remove a key. */
  delete(key: string): Promise<void>
  /** Bounded, fail-closed connectivity check. In-memory always resolves true. */
  ping(): Promise<boolean>
}

interface Entry {
  value: string
  /** Epoch ms when this entry expires, or undefined for no expiry. */
  expiresAt?: number
}

/**
 * In-memory `SharedStateStore` for single-instance / local use. Values are held
 * in a process-local Map with lazy expiry. NOT shared across processes.
 */
export function createInMemorySharedStateStore(
  now: () => number = Date.now,
): SharedStateStore {
  const store = new Map<string, Entry>()

  function live(key: string): Entry | undefined {
    const entry = store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt !== undefined && entry.expiresAt <= now()) {
      store.delete(key)
      return undefined
    }
    return entry
  }

  return {
    async get(key) {
      return live(key)?.value ?? null
    },
    async set(key, value, ttlSeconds) {
      store.set(key, {
        value,
        expiresAt:
          ttlSeconds !== undefined ? now() + ttlSeconds * 1000 : undefined,
      })
    },
    async increment(key, by = 1) {
      const entry = live(key)
      const current = entry ? Number(entry.value) : 0
      const next = (Number.isFinite(current) ? current : 0) + by
      store.set(key, { value: String(next), expiresAt: entry?.expiresAt })
      return next
    },
    async expire(key, ttlSeconds) {
      const entry = live(key)
      if (!entry) return
      entry.expiresAt = now() + ttlSeconds * 1000
    },
    async delete(key) {
      store.delete(key)
    },
    async ping() {
      return true
    },
  }
}
