import { buildApp } from "./app.ts"
import { loadConfig } from "./config/env.ts"
import { resolveSharedStateStore } from "./infra/sharedStateFactory.ts"

async function main(): Promise<void> {
  const config = loadConfig()

  // Deployment boundary for shared state (rate-limit / detection counters).
  // In-memory by default (single-instance, dev, tests). To run more than one
  // instance with GLOBAL limits, inject a provider-neutral Redis client factory
  // below — build your chosen client (ioredis / node-redis / …) from
  // config.redisUrl. The repository intentionally ships no Redis client and
  // selects no provider; setting REDIS_URL without wiring a factory here is a
  // fail-closed boot error rather than a silent per-process fallback. See
  // docs/PRODUCTION-INFRASTRUCTURE.md → Redis.
  const sharedState = resolveSharedStateStore(config, {
    // redisClientFactory: (url) => new Redis(url), // e.g. ioredis (operator-supplied)
  })

  const app = await buildApp({ config, sharedState })

  try {
    await app.listen({ port: config.port, host: config.host })
    console.log(
      `cyvantas-api listening on http://${config.host}:${config.port}`,
    )
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()
