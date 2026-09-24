import type { FastifyInstance, FastifyRequest } from "fastify"
import { success } from "../types/api.ts"
import { requireAuth } from "../plugins/auth.ts"
import type { EnvironmentActor } from "../services/environmentService.ts"

/** Actor derived ONLY from the server-side session, never from request input. */
function actorFrom(request: FastifyRequest): EnvironmentActor {
  const user = request.authUser!
  return { id: user.id, roles: user.roles }
}

/**
 * Progress + scoring read API (Phase 12).
 *
 * Authenticated, read-only view of the caller's own server-authoritative
 * progress: total points, solved count, and per-challenge attempts/points/
 * timestamps. Everything is computed server-side (the ScoreEvent ledger and
 * challenge_progress); the client is authoritative for nothing here and the
 * actor is taken from the session, never the request. Being a GET, it needs no
 * CSRF/rate-limit gate.
 */
export async function progressRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", { preHandler: requireAuth }, async (request) => {
    return success(await app.challengeService.getProgress(actorFrom(request)))
  })
}
