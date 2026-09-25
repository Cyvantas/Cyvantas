/**
 * Integration-test harness (live PostgreSQL + Redis).
 *
 * These helpers mirror the production deployment boundary in src/server.ts:
 * they load real configuration from the environment and select a Redis-backed
 * shared-state store through the Phase 17 factory (resolveSharedStateStore),
 * then build the app. Repositories default from config, so a set DATABASE_URL
 * selects the real Prisma/PostgreSQL path — exactly what CI validates.
 *
 * Gating: the live suites SKIP unless the relevant service URL is present, so
 * `npm test` on a machine without PostgreSQL/Redis (e.g. Termux/aarch64, where
 * the Prisma engine cannot run) does not fail. CI sets DATABASE_URL and
 * REDIS_URL, so the suites run there.
 */
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../../src/app.ts"
import { loadConfig, type AppConfig } from "../../../src/config/env.ts"
import { resolveSharedStateStore } from "../../../src/infra/sharedStateFactory.ts"
import { createMemorySink } from "../../../src/monitoring/sink.ts"
import type { RedisLikeClient } from "../../../src/infra/redisSharedStateStore.ts"

export const REDIS_URL = process.env.REDIS_URL
export const DATABASE_URL = process.env.DATABASE_URL

/** Live Redis is available (a redis:// URL is configured). */
export const hasRedis = Boolean(REDIS_URL)
/** Live PostgreSQL is available (a DATABASE_URL is configured). */
export const hasPostgres = Boolean(DATABASE_URL)
/** Both dependencies present — required by the full-stack / distributed suites. */
export const hasLiveInfra = hasRedis && hasPostgres

/**
 * Load config from the real environment. NODE_ENV stays "test" so cookies are
 * not forced Secure and the localhost CORS default applies (the CI job does not
 * terminate TLS); DATABASE_URL / REDIS_URL are still honored to select the real
 * backends. This isolates "does the real infra path work" from the separate
 * production-mode config fail-close checks (tests/productionHardening.test.ts).
 */
export function integrationConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return loadConfig({ ...env, NODE_ENV: "test" })
}

/**
 * Build an app instance wired to the given Redis client through the Phase 17
 * deployment-boundary factory. The factory closure returns the already-connected
 * client, matching how a deployment injects `(url) => new Redis(url)` — this
 * exercises resolveSharedStateStore → createRedisSharedStateStore end to end.
 * Repositories are NOT injected, so they default from config (Prisma when
 * DATABASE_URL is set).
 */
export async function buildIntegrationApp(
  client: RedisLikeClient,
): Promise<FastifyInstance> {
  const config = integrationConfig()
  const sharedState = resolveSharedStateStore(config, {
    redisClientFactory: () => client,
  })
  const app = await buildApp({ config, sharedState, sink: createMemorySink() })
  await app.ready()
  return app
}

/** Random suffix so parallel/repeated runs never collide on Redis keys. */
export function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}
