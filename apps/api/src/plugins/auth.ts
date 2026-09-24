/**
 * Authentication wiring and authorization guards.
 *
 * `registerAuth` decorates the request with server-derived auth context
 * (authUser/sessionId) populated from the session cookie on every request.
 * Authorization is ALWAYS decided from that server-side context — never from
 * client-supplied role data.
 *
 * The guard factories (requireAuth/requireRole/requireAnyRole) are reusable
 * preHandlers so authorization logic is defined once, not duplicated per route.
 */
import type {
  FastifyInstance,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify"
import type { RoleName } from "../domain/roles.ts"
import type { AuthService } from "../services/authService.ts"
import type { AppConfig } from "../config/env.ts"
import type { RateLimiter } from "../security/rateLimiter.ts"
import { ApiError } from "../types/api.ts"

export interface RegisterAuthDeps {
  authService: AuthService
  config: AppConfig
  rateLimiter: RateLimiter
}

export function registerAuth(
  app: FastifyInstance,
  deps: RegisterAuthDeps,
): void {
  app.decorate("authService", deps.authService)
  app.decorate("appConfig", deps.config)
  app.decorate("rateLimiter", deps.rateLimiter)
  app.decorateRequest("authUser", null)
  app.decorateRequest("sessionId", null)

  // Populate auth context from the session cookie. Never throws for missing or
  // invalid sessions — it simply leaves authUser null; guards enforce access.
  app.addHook("onRequest", async (request: FastifyRequest) => {
    const token = request.cookies?.[deps.config.sessionCookieName]
    if (!token) return
    const result = await deps.authService.authenticateByToken(token)
    if (result) {
      request.authUser = result.user
      request.sessionId = result.sessionId
    }
  })
}

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
) => {
  if (!request.authUser) {
    throw new ApiError("UNAUTHENTICATED", "Authentication required.", 401)
  }
}

export function requireAnyRole(roles: readonly RoleName[]): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    if (!request.authUser) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required.", 401)
    }
    const has = request.authUser.roles.some((r) => roles.includes(r))
    if (!has) {
      throw new ApiError("FORBIDDEN", "Insufficient permissions.", 403)
    }
  }
}

export function requireRole(role: RoleName): preHandlerHookHandler {
  return requireAnyRole([role])
}

export type { RateLimiter }
