import type { FastifyInstance } from "fastify"
import { success, notFound } from "../types/api.ts"
import { catalogService } from "../services/catalogService.ts"

/** Public challenge catalog (read-only metadata; no flags/answers/hints). */
export async function challengeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => success(catalogService.listChallenges()))

  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const challenge = catalogService.getChallenge(request.params.slug)
    if (!challenge) {
      throw notFound("CHALLENGE_NOT_FOUND", "Challenge not found")
    }
    return success(challenge)
  })
}
