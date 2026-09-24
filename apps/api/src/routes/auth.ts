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
import { RATE_RULES, type RateLimitRule } from "../security/rateLimiter.ts"

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

function enforceRateLimit(
  app: FastifyInstance,
  key: string,
  rule: RateLimitRule,
): void {
  const outcome = app.rateLimiter.check(key, rule)
  if (!outcome.allowed) {
    throw new ApiError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      429,
    )
  }
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
      enforceRateLimit(app, `register:${request.ip}`, RATE_RULES.register)

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
    enforceRateLimit(app, `login:${request.ip}:${body.email}`, RATE_RULES.login)

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
