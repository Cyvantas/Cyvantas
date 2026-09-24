/**
 * Environment lifecycle endpoints (Phase 9).
 *
 * Thin handlers: all authorization, ownership, catalog validation, limits, TTL,
 * and state transitions live in environmentService. Every route requires an
 * authenticated session; the actor is derived server-side from request.authUser
 * (never from the body), which prevents acting on another user's environments.
 *
 * Responses always use the safe EnvironmentDTO — userId, metadata, failure
 * messages, and runtime internals are never exposed. Mutating routes enforce a
 * trusted origin (CSRF defense) exactly like the auth routes.
 *
 * IMPORTANT: no container/sandbox/process is ever created here. `start` walks
 * the lifecycle to ACTIVE but the DTO reports runtimeConfigured=false and
 * runtimeStatus=NOT_PROVISIONED, so a client is never told a runtime is live.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { ApiError, success } from "../types/api.ts"
import { toEnvironmentDTO } from "../domain/environment.ts"
import { requireAuth } from "../plugins/auth.ts"
import { isTrustedOrigin } from "../security/csrf.ts"
import type {
  EnvironmentActor,
  RequestEnvironmentInput,
} from "../services/environmentService.ts"

const createEnvironmentSchema = z.object({
  type: z.enum(["CHALLENGE", "MISSION"]),
  challengeSlug: z.string().trim().min(1).max(200).optional(),
  missionSlug: z.string().trim().min(1).max(200).optional(),
})

/**
 * Client-PROPOSED sandbox policy. Shape/type validation only — every safety
 * decision (limits, forbidden destinations, dangerous capabilities) is made
 * server-side by the orchestrator's policy engine, not here.
 */
const sandboxRequestSchema = z
  .object({
    resources: z
      .object({
        cpuMillis: z.number().optional(),
        memoryMb: z.number().optional(),
        diskMb: z.number().optional(),
        pids: z.number().optional(),
        maxLifetimeSeconds: z.number().optional(),
        idleTimeoutSeconds: z.number().optional(),
      })
      .optional(),
    network: z
      .object({
        ingress: z.enum(["deny", "controlled"]).optional(),
        egress: z.enum(["deny", "allowlist"]).optional(),
        allowedDestinations: z.array(z.string().max(255)).max(50).optional(),
      })
      .optional(),
    capabilities: z
      .object({
        allowNetwork: z.boolean().optional(),
        allowOutboundHttp: z.boolean().optional(),
        allowOutboundDns: z.boolean().optional(),
        allowRawSockets: z.boolean().optional(),
        allowPrivileged: z.boolean().optional(),
        allowHostFilesystem: z.boolean().optional(),
        allowDeviceAccess: z.boolean().optional(),
      })
      .optional(),
    filesystem: z
      .object({
        readOnlyRootFilesystem: z.boolean().optional(),
        allowHostMounts: z.boolean().optional(),
      })
      .optional(),
  })
  .optional()

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError("VALIDATION_ERROR", "Request validation failed.", 400)
  }
  return result.data
}

function assertTrustedOrigin(app: FastifyInstance, request: FastifyRequest): void {
  const trusted = isTrustedOrigin({
    origin: request.headers.origin,
    referer: request.headers.referer,
    allowedOrigins: app.appConfig.corsOrigin,
  })
  if (!trusted) {
    throw new ApiError("CSRF_ORIGIN_REJECTED", "Request origin not allowed.", 403)
  }
}

function authContext(request: FastifyRequest) {
  return {
    ip: request.ip,
    userAgent: request.headers["user-agent"] ?? null,
  }
}

/** Actor derived ONLY from the server-side session, never from request input. */
function actorFrom(request: FastifyRequest): EnvironmentActor {
  const user = request.authUser!
  return { id: user.id, roles: user.roles }
}

function idempotencyKey(request: FastifyRequest): string | null {
  const header = request.headers["idempotency-key"]
  if (typeof header === "string" && header.trim() !== "") return header.trim()
  return null
}

export async function environmentRoutes(app: FastifyInstance): Promise<void> {
  const service = app.environmentService
  const runtimeConfigured = service.runtimeConfigured

  app.post(
    "/",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      assertTrustedOrigin(app, request)
      const body = parseBody(createEnvironmentSchema, request.body)
      const input: RequestEnvironmentInput = {
        type: body.type,
        challengeSlug: body.challengeSlug ?? null,
        missionSlug: body.missionSlug ?? null,
      }
      const env = await service.requestEnvironment(actorFrom(request), input, {
        idempotencyKey: idempotencyKey(request),
        ctx: authContext(request),
      })
      return reply
        .status(201)
        .send(success(toEnvironmentDTO(env, runtimeConfigured)))
    },
  )

  app.get(
    "/",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      const envs = await service.listUserEnvironments(actorFrom(request))
      return success(envs.map((e) => toEnvironmentDTO(e, runtimeConfigured)))
    },
  )

  app.get(
    "/:id",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string }
      const env = await service.getEnvironment(actorFrom(request), id)
      return success(toEnvironmentDTO(env, runtimeConfigured))
    },
  )

  app.post(
    "/:id/start",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      assertTrustedOrigin(app, request)
      const { id } = request.params as { id: string }
      const env = await service.activateEnvironment(
        actorFrom(request),
        id,
        authContext(request),
      )
      return success(toEnvironmentDTO(env, runtimeConfigured))
    },
  )

  app.post(
    "/:id/touch",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      assertTrustedOrigin(app, request)
      const { id } = request.params as { id: string }
      const env = await service.touchEnvironment(actorFrom(request), id)
      return success(toEnvironmentDTO(env, runtimeConfigured))
    },
  )

  app.post(
    "/:id/reset",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      assertTrustedOrigin(app, request)
      const { id } = request.params as { id: string }
      const env = await service.resetEnvironment(
        actorFrom(request),
        id,
        authContext(request),
      )
      return success(toEnvironmentDTO(env, runtimeConfigured))
    },
  )

  app.post(
    "/:id/stop",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      assertTrustedOrigin(app, request)
      const { id } = request.params as { id: string }
      const env = await service.stopEnvironment(
        actorFrom(request),
        id,
        authContext(request),
      )
      return success(toEnvironmentDTO(env, runtimeConfigured))
    },
  )

  app.delete(
    "/:id",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      assertTrustedOrigin(app, request)
      const { id } = request.params as { id: string }
      const env = await service.destroyEnvironment(
        actorFrom(request),
        id,
        authContext(request),
      )
      return success(toEnvironmentDTO(env, runtimeConfigured))
    },
  )

  // ----- Sandbox orchestration (Phase 10) -------------------------------------
  // Thin handlers: ownership is enforced by loading the environment through the
  // environment service (404 for not-owned), then the orchestrator makes every
  // policy/runtime decision. No business logic lives here.

  const orchestrator = app.sandboxOrchestrator

  app.get(
    "/:id/sandbox",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string }
      const env = await service.getEnvironment(actorFrom(request), id)
      return success(orchestrator.describeSandbox(env))
    },
  )

  app.post(
    "/:id/sandbox/provision",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      assertTrustedOrigin(app, request)
      const { id } = request.params as { id: string }
      const env = await service.getEnvironment(actorFrom(request), id)
      const body = parseBody(sandboxRequestSchema, request.body)
      const descriptor = await orchestrator.provision(
        env,
        body,
        { userId: env.userId, ...authContext(request) },
        idempotencyKey(request),
      )
      return success(descriptor)
    },
  )
}
