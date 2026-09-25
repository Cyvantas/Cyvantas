/**
 * Authentication endpoints: register, login, logout, me.
 *
 * Cookies: the session token is delivered ONLY as an HttpOnly cookie
 * (Secure in production, SameSite=Lax). It is never placed in the JSON body,
 * and passwordHash / session tokens are never returned.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { success } from "../types/api.ts"
import { ApiError } from "../types/api.ts"
import { toUserDTO } from "../domain/user.ts"
import { loginSchema, registerSchema } from "../validation/authSchemas.ts"
import { requireAuth } from "../plugins/auth.ts"
import { isTrustedOrigin } from "../security/csrf.ts"
import { RATE_RULES } from "../security/rateLimiter.ts"
import { enforceAbuseControls, type AbuseCheck } from "../security/abuseGuard.ts"
import type { RequestContext } from "../monitoring/securityMonitor.ts"

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

/**
 * Request context for the security monitor. Auth routes are unauthenticated at
 * entry, so actorId is null — the monitor keys detection on IP here.
 */
function monitorCtx(request: FastifyRequest): RequestContext {
  return {
    ip: request.ip,
    userAgent: request.headers["user-agent"] ?? null,
    requestId: request.requestId,
    actorId: request.authUser?.id ?? null,
  }
}

/**
 * Enforce layered rate limits, FAIL-CLOSED, emitting a RATE_LIMIT_EXCEEDED
 * security event on denial and throwing a uniform 429. The response reveals no
 * limit details.
 */
function enforceAuthLimit(
  app: FastifyInstance,
  request: FastifyRequest,
  checks: readonly AbuseCheck[],
): Promise<void> {
  return enforceAbuseControls(
    { limiter: app.rateLimiter, monitor: app.securityMonitor },
    monitorCtx(request),
    checks,
  )
}

function sessionCookieOptions(app: FastifyInstance) {
  return {
    httpOnly: true,
    secure: app.appConfig.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: app.appConfig.sessionTtlSeconds,
  }
}

function authContext(request: FastifyRequest) {
  return {
    ip: request.ip,
    userAgent: request.headers["user-agent"] ?? null,
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const cookieName = app.appConfig.sessionCookieName

  app.post(
    "/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      assertTrustedOrigin(app, request)
      await enforceAuthLimit(app, request, [
        { scope: "register:ip", key: `register:${request.ip}`, rule: RATE_RULES.register },
      ])

      const body = parseBody(registerSchema, request.body)
      const issued = await app.authService.register(
        { email: body.email, password: body.password, displayName: body.displayName },
        authContext(request),
      )
      reply.setCookie(cookieName, issued.token, sessionCookieOptions(app))
      return reply.status(201).send(success(toUserDTO(issued.user)))
    },
  )

  app.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    assertTrustedOrigin(app, request)
    const body = parseBody(loginSchema, request.body)
    await enforceAuthLimit(app, request, [
      {
        scope: "login:ip-email",
        key: `login:${request.ip}:${body.email}`,
        rule: RATE_RULES.login,
      },
      { scope: "login:ip", key: `login:ip:${request.ip}`, rule: RATE_RULES.loginPerIp },
    ])

    const issued = await app.authService.login(
      { email: body.email, password: body.password },
      authContext(request),
    )
    reply.setCookie(cookieName, issued.token, sessionCookieOptions(app))
    return success(toUserDTO(issued.user))
  })

  app.post(
    "/logout",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      assertTrustedOrigin(app, request)
      // requireAuth guarantees these are set.
      const user = request.authUser!
      const sessionId = request.sessionId!
      await app.authService.logout(sessionId, user.id, authContext(request))
      reply.clearCookie(cookieName, { path: "/" })
      return success({ loggedOut: true })
    },
  )

  app.get(
    "/me",
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      return success(toUserDTO(request.authUser!))
    },
  )
}
