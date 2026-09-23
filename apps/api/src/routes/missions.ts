import type { FastifyInstance } from "fastify"
import { success, notFound } from "../types/api.ts"
import { catalogService } from "../services/catalogService.ts"

/** Public mission metadata (read-only; no flags/answers). */
export async function missionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => success(catalogService.listMissions()))

  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const mission = catalogService.getMission(request.params.slug)
    if (!mission) {
      throw notFound("MISSION_NOT_FOUND", "Mission not found")
    }
    return success(mission)
  })
}
