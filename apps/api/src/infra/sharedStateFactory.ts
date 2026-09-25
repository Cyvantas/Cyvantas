/**
 * Deployment-boundary resolver for the shared-state store (Phase 17).
 *
 * The rate limiter and abuse-detection tracker are already backed by a
 * `SharedStateStore` (Phase 16) and the enforcement path is async + fail-closed.
 * What was missing was the *selection*: `buildApp` defaulted to the in-memory
 * store even when `REDIS_URL` was set, so a multi-instance production deployment
 * would silently keep per-process counters and NOT enforce a global limit.
 *
 * This resolver closes that gap and stays strictly provider-neutral:
 *   - `REDIS_URL` unset  → in-memory store (correct for dev, tests, and a genuine
 *     single instance).
 *   - `REDIS_URL` set + an injected `redisClientFactory` → a Redis-backed store
 *     built from the operator's chosen client (ioredis / node-redis / …).
 *   - `REDIS_URL` set + NO factory → **fail-closed**: throw at boot rather than
 *     fall back to per-process limits. Requesting a shared store and silently not
 *     getting one is the dangerous case, so we refuse to start instead.
 *
 * No Redis client package is installed or imported here, and no provider is
 * selected — the deployment supplies the client at the boundary (see
 * `src/server.ts` and docs/PRODUCTION-INFRASTRUCTURE.md → Redis).
 */
import {
  createInMemorySharedStateStore,
  type SharedStateStore,
} from "./sharedState.ts"
import {
  createRedisSharedStateStore,
  type RedisLikeClient,
  type RedisSharedStateOptions,
} from "./redisSharedStateStore.ts"

/** Only the field the resolver needs, so tests can pass a tiny object. */
export interface SharedStateConfig {
  readonly redisUrl: string | undefined
}

export interface ResolveSharedStateDeps {
  /**
   * Provider-neutral client factory. A deployment running more than one instance
   * builds a `RedisLikeClient` from the URL here (e.g. `(url) => new Redis(url)`).
   * The repository ships none, staying provider-neutral, so this is undefined by
   * default and setting `REDIS_URL` without it is a boot error (fail-closed).
   */
  readonly redisClientFactory?: (redisUrl: string) => RedisLikeClient
  /** Forwarded to the Redis adapter (e.g. bounded `ping()` timeout). */
  readonly redisOptions?: RedisSharedStateOptions
}

/**
 * Raised when `REDIS_URL` is configured but no Redis client was wired at the
 * deployment boundary. The message NEVER includes the connection string.
 */
export class SharedStateConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SharedStateConfigError"
  }
}

/**
 * Select the shared-state store for the running instance. Pure and side-effect
 * free apart from constructing the chosen store (the injected factory may open a
 * connection — that is the deployment's concern, not this function's).
 */
export function resolveSharedStateStore(
  config: SharedStateConfig,
  deps: ResolveSharedStateDeps = {},
): SharedStateStore {
  if (!config.redisUrl) {
    return createInMemorySharedStateStore()
  }
  if (!deps.redisClientFactory) {
    // Fail-closed: never silently degrade to per-process limits when a shared
    // store was explicitly requested. The message is safe to log — no URL.
    throw new SharedStateConfigError(
      "REDIS_URL is set but no Redis client was wired at the deployment " +
        "boundary. Inject a redisClientFactory that builds a RedisLikeClient " +
        "(see src/infra/redisSharedStateStore.ts), or unset REDIS_URL to use " +
        "the in-memory store (single-instance only).",
    )
  }
  const client = deps.redisClientFactory(config.redisUrl)
  return createRedisSharedStateStore(client, deps.redisOptions)
}
