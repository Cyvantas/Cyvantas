import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"

describe("GET /health", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it("returns ok status with service metadata", async () => {
    const res = await app.inject({ method: "GET", url: "/health" })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      data: {
        status: "ok",
        service: "cyvantas-api",
        version: "0.1.0",
      },
    })
  })

  it("requires no authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/health" })
    expect(res.statusCode).toBe(200)
  })
})
