import type { FastifyInstance } from "fastify"
import { notImplemented } from "../types/api.ts"

/**
 * Flag submission — STUB ONLY (Phase 7).
 *
 * No flag is ever validated here and no real flag exists in source. Submissions
 * are never marked "correct". Server-authoritative flag validation belongs to a
 * later phase (see docs/LAB-BACKEND-ARCHITECTURE.md §18).
 */
export async function flagRoutes(app: FastifyInstance): Promise<void> {
  app.post("/submit", async () => {
    throw notImplemented(
      "FLAG_SERVICE_NOT_IMPLEMENTED",
      "Flag validation is not implemented yet",
    )
  })
}
