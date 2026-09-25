import type { FastifyInstance, FastifyReply } from "fastify"
import { success } from "../types/api.ts"
import type { ReadinessService } from "../health/readiness.ts"

export interface ReadinessRoutesDeps {
  readiness: ReadinessService
}

/**
 * Readiness endpoint. No authentication. Unlike /health it probes the
 * dependencies required to serve traffic (database, shared state) and returns
 * 503 when any is unavailable, so a load balancer can hold an instance out of
 * rotation until it is healthy. The body carries only coarse per-check statuses
 * — never credentials, connection strings, or raw errors.
 */
export async function readinessRoutes(
  app: FastifyInstance,
  deps: ReadinessRoutesDeps,
): Promise<void> {
  app.get("/ready", async (_request, reply: FastifyReply) => {
    const report = await deps.readiness.check()
    return reply
      .status(report.ready ? 200 : 503)
      .send(
        success({
          status: report.ready ? "ready" : "not_ready",
          checks: report.checks,
        }),
      )
  })
}
