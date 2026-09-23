import type { FastifyInstance } from "fastify"
import { success } from "../types/api.ts"
import { challengeRoutes } from "./challenges.ts"
import { learningRoutes } from "./learning.ts"
import { missionRoutes } from "./missions.ts"
import { environmentRoutes } from "./environments.ts"
import { progressRoutes } from "./progress.ts"
import { flagRoutes } from "./flags.ts"

/** All /api/v1 routes. Registered under the "/api/v1" prefix in app.ts. */
export async function apiV1Routes(app: FastifyInstance): Promise<void> {
  app.get("/", async () =>
    success({
      name: "CYVANTAS Security Lab API",
      version: "v1",
      status: "skeleton",
    }),
  )

  await app.register(challengeRoutes, { prefix: "/challenges" })
  await app.register(learningRoutes, { prefix: "/learning" })
  await app.register(missionRoutes, { prefix: "/missions" })
  await app.register(environmentRoutes, { prefix: "/environments" })
  await app.register(progressRoutes, { prefix: "/progress" })
  await app.register(flagRoutes, { prefix: "/flags" })
}
