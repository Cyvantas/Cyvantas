import type { FastifyInstance } from "fastify"
import { notImplemented } from "../types/api.ts"

/**
 * Progress persistence — STUB ONLY (Phase 7). No accounts, no storage.
 * Returns 501 until account-scoped progress lands in a later phase.
 */
export async function progressRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    throw notImplemented(
      "PROGRESS_SERVICE_NOT_IMPLEMENTED",
      "Progress persistence is not implemented yet",
    )
  })
}
