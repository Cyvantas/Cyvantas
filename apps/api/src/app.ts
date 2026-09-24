import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import { loadConfig, type AppConfig } from "./config/env.ts"
import { ApiError, errorEnvelope } from "./types/api.ts"
import { healthRoutes } from "./routes/health.ts"
import { apiV1Routes } from "./routes/index.ts"
import { createRepositories } from "./repositories/index.ts"
import type { Repositories } from "./repositories/types.ts"
import { createAuthService } from "./services/authService.ts"
import { createEnvironmentService } from "./services/environmentService.ts"
import { createChallengeService } from "./services/challengeService.ts"
import { createChallengeRegistry } from "./challenges/index.ts"
import { catalogService } from "./services/catalogService.ts"
import { notConfiguredRuntimeProvider } from "./services/runtime/environmentRuntimeProvider.ts"
import { createInMemoryIdempotencyStore } from "./services/idempotencyStore.ts"
import { createSandboxOrchestrator } from "./orchestration/index.ts"
import { registerAuth } from "./plugins/auth.ts"
import { createInMemoryRateLimiter } from "./security/rateLimiter.ts"

export interface BuildAppOptions {
  config?: AppConfig
  /** Inject repositories (tests use in-memory); defaults from config. */
  repositories?: Repositories
}

/**
 * Build the Fastify app. Pure and side-effect free: no listening, no network,
 * no process spawning. Safe to construct in tests and inject requests against.
 */
export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig()

  const app = Fastify({
    logger: false,
    // Reject oversized bodies at the boundary (baseline abuse protection).
    bodyLimit: 256 * 1024,
  })

  // Explicit, non-wildcard CORS. Origins come from config (never "*").
  // credentials:true is required so browsers send/receive the session cookie.
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })

  await app.register(cookie)

  // Persistence + auth wiring. Repositories default from config (Postgres via
  // Prisma when DATABASE_URL is set, otherwise in-memory); tests inject their
  // own. The auth service and guards derive all authorization server-side.
  const repositories =
    options.repositories ?? (await createRepositories(config))
  const authService = createAuthService({
    repositories,
    sessionTtlSeconds: config.sessionTtlSeconds,
  })
  registerAuth(app, {
    authService,
    config,
    rateLimiter: createInMemoryRateLimiter(),
  })

  // Environment service: pure business logic over repository interfaces and a
  // runtime provider. Phase 9 wires the "not configured" runtime, so it never
  // starts a container/process; runtimeStatus stays NOT_PROVISIONED honestly.
  const environmentService = createEnvironmentService({
    repositories,
    catalog: catalogService,
    runtime: notConfiguredRuntimeProvider,
    policy: config.environment,
    idempotency: createInMemoryIdempotencyStore(),
  })
  app.decorate("environmentService", environmentService)

  // Challenge service (Phase 11): challenge-environment lifecycle + server-side
  // flag verification. It REUSES environmentService (and thus the same runtime
  // seam), holds the flag only inside a verifier closure, and returns only safe
  // views / a boolean result. No execution capability of its own.
  const challengeService = createChallengeService({
    environments: environmentService,
    catalog: catalogService,
    registry: createChallengeRegistry(),
    audit: repositories.audit,
    progress: repositories.progress,
  })
  app.decorate("challengeService", challengeService)

  // Sandbox orchestrator (Phase 10): server-authoritative policy + runtime
  // coordination behind the SAME runtime-provider seam. Wired with the "not
  // configured" runtime, so it enforces policy and audits honestly but never
  // provisions a real container/process.
  const sandboxOrchestrator = createSandboxOrchestrator({
    runtime: notConfiguredRuntimeProvider,
    audit: repositories.audit,
  })
  app.decorate("sandboxOrchestrator", sandboxOrchestrator)

  app.addHook("onClose", async () => {
    await repositories.shutdown()
  })

  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof ApiError) {
        return reply
          .status(error.status)
          .send(errorEnvelope(error.code, error.message, error.status))
      }

      if (error.validation) {
        return reply
          .status(400)
          .send(
            errorEnvelope(
              "VALIDATION_ERROR",
              "Request validation failed",
              400,
            ),
          )
      }

      if (typeof error.statusCode === "number" && error.statusCode < 500) {
        return reply
          .status(error.statusCode)
          .send(
            errorEnvelope("BAD_REQUEST", "Request could not be processed", error.statusCode),
          )
      }

      // Unexpected: log server-side, return a generic envelope (no stack leak).
      app.log.error(error)
      return reply
        .status(500)
        .send(errorEnvelope("INTERNAL_ERROR", "Internal server error", 500))
    },
  )

  app.setNotFoundHandler(
    (_request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .status(404)
        .send(errorEnvelope("NOT_FOUND", "Resource not found", 404))
    },
  )

  await app.register(healthRoutes)
  await app.register(apiV1Routes, { prefix: "/api/v1" })

  return app
}
