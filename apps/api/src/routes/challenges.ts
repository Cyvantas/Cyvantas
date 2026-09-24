import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { ApiError, success, notFound } from "../types/api.ts"
import { catalogService } from "../services/catalogService.ts"
import { requireAuth } from "../plugins/auth.ts"
import { isTrustedOrigin } from "../security/csrf.ts"
import { RATE_RULES, type RateLimitRule } from "../security/rateLimiter.ts"
import type { EnvironmentActor } from "../services/environmentService.ts"

const submitSchema = z.object({
  environmentId: z.string().trim().min(1).max(200),
  answer: z.string().min(1).max(512),
})

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
  return { ip: request.ip, userAgent: request.headers["user-agent"] ?? null }
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

/** Per-user rate gate. Throws 429 when the window is exhausted. */
function enforceRateLimit(
  app: FastifyInstance,
  request: FastifyRequest,
  bucket: string,
  rule: RateLimitRule,
): void {
  const key = `${bucket}:${request.authUser!.id}`
  const result = app.rateLimiter.check(key, rule)
  if (!result.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many requests. Try again later.", 429)
  }
}

/**
 * Challenge routes (Phase 11).
 *
 * Read-only catalog (GET / and GET /:slug) plus authenticated challenge-
 * environment lifecycle and server-authoritative flag submission. All mutating
 * routes require auth, enforce a trusted origin (CSRF), and are rate-limited.
 * The actor is always derived from the session, never from the body. No flag is
 * ever returned; submission responds only with `{ correct }`.
 */
export async function challengeRoutes(app: FastifyInstance): Promise<void> {
  const service = app.challengeService

  app.get("/", async () => success(catalogService.listChallenges()))

  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const challenge = catalogService.getChallengeDetail(request.params.slug)
    if (!challenge) {
      throw notFound("CHALLENGE_NOT_FOUND", "Challenge not found")
    }
    return success(challenge)
  })

  app.post<{ Params: { slug: string } }>(
    "/:slug/environments",
    { preHandler: requireAuth },
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      assertTrustedOrigin(app, request)
      enforceRateLimit(app, request, "challenge-env-create", RATE_RULES.challengeEnvironmentCreate)
      const view = await service.createEnvironment(actorFrom(request), request.params.slug, {
        idempotencyKey: idempotencyKey(request),
        ctx: authContext(request),
      })
      return reply.status(201).send(success(view))
    },
  )

  app.get<{ Params: { slug: string; environmentId: string } }>(
    "/:slug/environments/:environmentId",
    { preHandler: requireAuth },
    async (request: FastifyRequest<{ Params: { slug: string; environmentId: string } }>) => {
      const { slug, environmentId } = request.params
      const view = await service.getEnvironment(actorFrom(request), slug, environmentId)
      return success(view)
    },
  )

  app.post<{ Params: { slug: string; environmentId: string } }>(
    "/:slug/environments/:environmentId/reset",
    { preHandler: requireAuth },
    async (request: FastifyRequest<{ Params: { slug: string; environmentId: string } }>) => {
      assertTrustedOrigin(app, request)
      enforceRateLimit(app, request, "challenge-env-reset", RATE_RULES.challengeEnvironmentReset)
      const { slug, environmentId } = request.params
      const view = await service.resetEnvironment(
        actorFrom(request),
        slug,
        environmentId,
        authContext(request),
      )
      return success(view)
    },
  )

  app.post<{ Params: { slug: string } }>(
    "/:slug/submit",
    { preHandler: requireAuth },
    async (request: FastifyRequest<{ Params: { slug: string } }>) => {
      assertTrustedOrigin(app, request)
      enforceRateLimit(app, request, "challenge-submit", RATE_RULES.challengeSubmit)
      const body = parseBody(submitSchema, request.body)
      const result = await service.submit(
        actorFrom(request),
        request.params.slug,
        { environmentId: body.environmentId, answer: body.answer },
        authContext(request),
      )
      return success(result)
    },
  )
}
