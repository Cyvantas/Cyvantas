import type { FastifyInstance } from "fastify"
import { notImplemented } from "../types/api.ts"

/**
 * Environment provisioning — CONTRACT STUBS ONLY (Phase 7).
 *
 * Every route returns 501. No sandbox is provisioned, no container is created,
 * no environment id is minted, and nothing is claimed to exist. Real
 * provisioning belongs to a later phase (see docs/LAB-BACKEND-ARCHITECTURE.md).
 */
export async function environmentRoutes(app: FastifyInstance): Promise<void> {
  const stub = () => {
    throw notImplemented(
      "ENVIRONMENT_SERVICE_NOT_IMPLEMENTED",
      "Environment provisioning is not implemented yet",
    )
  }

  app.post("/", stub)
  app.get("/:id", stub)
  app.post("/:id/start", stub)
  app.post("/:id/reset", stub)
  app.post("/:id/stop", stub)
}
