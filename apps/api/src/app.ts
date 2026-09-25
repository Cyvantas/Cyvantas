import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify"
import { randomUUID } from "node:crypto"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import { loadConfig, type AppConfig } from "./config/env.ts"
import { ApiError, errorEnvelope } from "./types/api.ts"
import { healthRoutes } from "./routes/health.ts"
import { readinessRoutes } from "./routes/readiness.ts"
import { apiV1Routes } from "./routes/index.ts"
import { createReadinessService, type ReadinessService } from "./health/readiness.ts"
import { createInMemorySharedStateStore, type SharedStateStore } from "./infra/sharedState.ts"
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
import {
  createConsoleSink,
  createDetectionTracker,
  createMonitoringAuditRepository,
  createNoopSink,
  createSecurityMonitor,
  type SecurityEventSink,
} from "./monitoring/index.ts"

export interface BuildAppOptions {
  config?: AppConfig
  /** Inject repositories (tests use in-memory); defaults from config. */
  repositories?: Repositories
  /**
   * Inject a security-event sink (tests capture with a memory sink). Defaults
   * to a console sink when config.security.logSecurityEvents is true, otherwise
   * a noop sink.
   */
  sink?: SecurityEventSink
  /**
   * Inject a readiness service (tests supply controlled probes). Defaults to a
   * service probing the backing store (repositories.checkHealth) and the
   * shared-state store.
   */
  readiness?: ReadinessService
  /** Inject a shared-state store (tests/fakes); defaults to in-memory. */
  sharedState?: SharedStateStore
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

  // Correlation id: assign on every request FIRST so all later hooks, handlers,
  // and the error handler can reference request.requestId. Honors an inbound
  // X-Request-Id only when it matches a safe charset/length (so it can never
  // smuggle control characters or header-splitting bytes into logs/responses),
  // otherwise mints one. Always echoed back on the response header. Security
  // response headers are set on the same hook so every response — including
  // errors and 404s — carries them.
  const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,200}$/
  const isProd = config.nodeEnv === "production"
  app.decorateRequest("requestId", "")
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const inbound = request.headers["x-request-id"]
    request.requestId =
      typeof inbound === "string" && REQUEST_ID_PATTERN.test(inbound)
        ? inbound
        : randomUUID()
    reply.header("x-request-id", request.requestId)

    // Baseline hardening headers. The API serves only JSON and is never framed
    // or embedded, so lock everything down: no sniffing, no framing, no
    // referrer leakage, and a null-by-default CSP. HSTS only in production
    // (where TLS is terminated) to avoid poisoning local http development.
    reply.header("X-Content-Type-Options", "nosniff")
    reply.header("X-Frame-Options", "DENY")
    reply.header("Referrer-Policy", "no-referrer")
    reply.header("Cross-Origin-Resource-Policy", "same-origin")
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    if (isProd) {
      reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    }
  })

  // Explicit, non-wildcard CORS. Origins come from config (never "*").
  // credentials:true is required so browsers send/receive the session cookie.
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })

  await app.register(cookie)

  // Security monitor (Phase 13): the single funnel for structured security
  // events + detection. The sink is a console (JSON-lines) sink in normal runs
  // and a noop under test unless a memory sink is injected. Detection state is
  // per-process (matching the rate limiter) and resets when the app restarts.
  const sink =
    options.sink ??
    (config.security.logSecurityEvents ? createConsoleSink() : createNoopSink())
  const securityMonitor = createSecurityMonitor({
    sink,
    detection: createDetectionTracker(),
    config: config.security.detection,
  })
  app.decorate("securityMonitor", securityMonitor)

  // Persistence + auth wiring. Repositories default from config (Postgres via
  // Prisma when DATABASE_URL is set, otherwise in-memory); tests inject their
  // own. The auth service and guards derive all authorization server-side.
  const baseRepositories =
    options.repositories ?? (await createRepositories(config))

  // Wrap the audit repository so EVERY persisted audit event is also emitted as
  // a structured security event and fed to detection — without changing any
  // service. All services below receive this monitored repositories object.
  const repositories: Repositories = {
    ...baseRepositories,
    audit: createMonitoringAuditRepository(baseRepositories.audit, securityMonitor),
  }

  const authService = createAuthService({
    repositories,
    sessionTtlSeconds: config.sessionTtlSeconds,
  })
  registerAuth(app, {
    authService,
    config,
    rateLimiter: createInMemoryRateLimiter(),
  })

  // After auth context is populated: detect a presented-but-invalid session and
  // observe the request for burst detection. Both are OBSERVE-ONLY (they never
  // block a request); enforcement is the abuse guard's job at the route level.
  const sessionCookieName = config.sessionCookieName
  app.addHook("onRequest", async (request: FastifyRequest) => {
    const ctx = {
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null,
      requestId: request.requestId,
      actorId: request.authUser?.id ?? null,
    }
    securityMonitor.requestObserved(ctx)
    const token = request.cookies?.[sessionCookieName]
    if (token && !request.authUser) {
      securityMonitor.invalidSession(ctx)
    }
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
    scoring: repositories.scoring,
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

  // Shared-state store (provider-neutral). In-memory by default and thus
  // single-instance only; a multi-instance deployment injects a Redis-backed
  // adapter. Exposed as a decoration so future callers (e.g. a shared rate
  // limiter) resolve it from the app.
  const sharedState = options.sharedState ?? createInMemorySharedStateStore()
  app.decorate("sharedState", sharedState)

  // Readiness: probes the dependencies required to serve traffic. Bounded and
  // fail-closed; the report exposes only coarse per-check statuses. The DB probe
  // is a trivial round-trip against the configured backend (in-memory store is
  // always ready; Prisma runs SELECT 1). Distinct from /health, which never
  // touches a dependency.
  const readiness =
    options.readiness ??
    createReadinessService([
      { name: "database", check: () => repositories.checkHealth() },
      { name: "sharedState", check: () => sharedState.ping() },
    ])
  app.decorate("readiness", readiness)

  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // Attach the correlation id to every error envelope so a client can quote
      // it in a report and it can be joined to the server-side security events.
      const withRequestId = (env: ReturnType<typeof errorEnvelope>) => {
        env.error.requestId = request.requestId
        return env
      }

      if (error instanceof ApiError) {
        return reply
          .status(error.status)
          .send(withRequestId(errorEnvelope(error.code, error.message, error.status)))
      }

      if (error.validation) {
        return reply
          .status(400)
          .send(
            withRequestId(
              errorEnvelope(
                "VALIDATION_ERROR",
                "Request validation failed",
                400,
              ),
            ),
          )
      }

      if (typeof error.statusCode === "number" && error.statusCode < 500) {
        return reply
          .status(error.statusCode)
          .send(
            withRequestId(
              errorEnvelope("BAD_REQUEST", "Request could not be processed", error.statusCode),
            ),
          )
      }

      // Unexpected: log server-side, return a generic envelope (no stack leak).
      app.log.error(error)
      return reply
        .status(500)
        .send(withRequestId(errorEnvelope("INTERNAL_ERROR", "Internal server error", 500)))
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
  await app.register(readinessRoutes, { readiness })
  await app.register(apiV1Routes, { prefix: "/api/v1" })

  return app
}
