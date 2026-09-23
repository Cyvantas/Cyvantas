import type { FastifyInstance } from "fastify"
import { success, notFound } from "../types/api.ts"
import { catalogService } from "../services/catalogService.ts"

/** Public learning-path metadata (read-only). */
export async function learningRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => success(catalogService.listLearningPaths()))

  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const path = catalogService.getLearningPath(request.params.slug)
    if (!path) {
      throw notFound("LEARNING_PATH_NOT_FOUND", "Learning path not found")
    }
    return success(path)
  })
}
