import type { AuthUser } from "../domain/user.ts"
import type { AuthService } from "../services/authService.ts"
import type { EnvironmentService } from "../services/environmentService.ts"
import type { AppConfig } from "../config/env.ts"
import type { RateLimiter } from "../security/rateLimiter.ts"

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthUser | null
    sessionId: string | null
  }
  interface FastifyInstance {
    authService: AuthService
    environmentService: EnvironmentService
    appConfig: AppConfig
    rateLimiter: RateLimiter
  }
}

export {}
