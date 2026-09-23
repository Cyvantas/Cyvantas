import type { FastifyInstance } from "fastify"
import { success } from "../types/api.ts"
import { SERVICE_NAME, SERVICE_VERSION } from "../config/env.ts"

/** Liveness endpoint. No authentication, no dependencies. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () =>
    success({
      status: "ok",
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
    }),
  )
}
