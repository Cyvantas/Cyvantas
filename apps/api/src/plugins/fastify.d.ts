import type { AuthUser } from "../domain/user.ts"
import type { AuthService } from "../services/authService.ts"
import type { EnvironmentService } from "../services/environmentService.ts"
import type { ChallengeService } from "../services/challengeService.ts"
import type { SandboxOrchestrator } from "../orchestration/index.ts"
import type { AppConfig } from "../config/env.ts"
import type { RateLimiter } from "../security/rateLimiter.ts"
import type { SecurityMonitor } from "../monitoring/securityMonitor.ts"
import type { SharedStateStore } from "../infra/sharedState.ts"
import type { ReadinessService } from "../health/readiness.ts"

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthUser | null
    sessionId: string | null
    /** Correlation id assigned on every request (Phase 13). */
    requestId: string
  }
  interface FastifyInstance {
    authService: AuthService
    environmentService: EnvironmentService
    challengeService: ChallengeService
    sandboxOrchestrator: SandboxOrchestrator
    appConfig: AppConfig
    rateLimiter: RateLimiter
    securityMonitor: SecurityMonitor
    sharedState: SharedStateStore
    readiness: ReadinessService
  }
}

export {}
