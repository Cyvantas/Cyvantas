/**
 * Idempotency-key store for safe retries of environment CREATION.
 *
 * SCOPE / LIMITATION: this is a single-process, in-memory, best-effort store —
 * exactly like the rate limiter. It is NOT shared across replicas and does NOT
 * persist across restarts, so it de-duplicates create retries only within one
 * process instance. A production multi-instance deployment must back this with
 * a shared store (e.g. Redis) or a database uniqueness constraint. The narrow
 * interface here lets that replacement drop in without touching callers.
 *
 * Lifecycle operations (start/reset/stop/destroy) do NOT rely on this store:
 * they are made idempotent by the state machine itself (repeating an operation
 * that reaches an already-current state is a safe no-op). This store only guards
 * creation, where a retry would otherwise mint a second environment.
 */

interface StoredEntry {
  environmentId: string
  expiresAt: number
}

export interface IdempotencyStore {
  /** Returns a previously stored environment id for this key, or null. */
  get(userId: string, key: string): string | null
  /** Records the environment id created for this key. */
  set(userId: string, key: string, environmentId: string): void
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h — retries are short-lived

export function createInMemoryIdempotencyStore(
  now: () => number = Date.now,
  ttlMs: number = DEFAULT_TTL_MS,
): IdempotencyStore {
  const entries = new Map<string, StoredEntry>()

  function compositeKey(userId: string, key: string): string {
    // Namespacing by userId ensures one user's key cannot collide with or read
    // another user's stored result.
    return `${userId}::${key}`
  }

  return {
    get(userId, key): string | null {
      const entry = entries.get(compositeKey(userId, key))
      if (!entry) return null
      if (entry.expiresAt <= now()) {
        entries.delete(compositeKey(userId, key))
        return null
      }
      return entry.environmentId
    },
    set(userId, key, environmentId): void {
      entries.set(compositeKey(userId, key), {
        environmentId,
        expiresAt: now() + ttlMs,
      })
    },
  }
}
