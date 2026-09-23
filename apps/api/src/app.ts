import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify"
import cors from "@fastify/cors"
import { loadConfig, type AppConfig } from "./config/env.ts"
import { ApiError, errorEnvelope } from "./types/api.ts"
import { healthRoutes } from "./routes/health.ts"
import { apiV1Routes } from "./routes/index.ts"

export interface BuildAppOptions {
  config?: AppConfig
}

/**
 * Build the Fastify app. Pure and side-effect free: no listening, no network,
 * no process spawning. Safe to construct in tests and inject requests against.
 */
export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig()

  const app = Fastify({
    logger: false,
    // Reject oversized bodies at the boundary (baseline abuse protection).
    bodyLimit: 256 * 1024,
  })

  // Explicit, non-wildcard CORS. Origins come from config (never "*").
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
  })

  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof ApiError) {
        return reply
          .status(error.status)
          .send(errorEnvelope(error.code, error.message, error.status))
      }

      if (error.validation) {
        return reply
          .status(400)
          .send(
            errorEnvelope(
              "VALIDATION_ERROR",
              "Request validation failed",
              400,
            ),
          )
      }

      if (typeof error.statusCode === "number" && error.statusCode < 500) {
        return reply
          .status(error.statusCode)
          .send(
            errorEnvelope("BAD_REQUEST", "Request could not be processed", error.statusCode),
          )
      }

      // Unexpected: log server-side, return a generic envelope (no stack leak).
      app.log.error(error)
      return reply
        .status(500)
        .send(errorEnvelope("INTERNAL_ERROR", "Internal server error", 500))
    },
  )

  app.setNotFoundHandler(
    (_request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .status(404)
        .send(errorEnvelope("NOT_FOUND", "Resource not found", 404))
    },
  )

  await app.register(healthRoutes)
  await app.register(apiV1Routes, { prefix: "/api/v1" })

  return app
}
