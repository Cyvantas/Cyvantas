import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe("GET /api/v1", () => {
  it("returns the API root descriptor", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1" })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      data: {
        name: "CYVANTAS Security Lab API",
        version: "v1",
        status: "skeleton",
      },
    })
  })
})

describe("GET /api/v1/challenges", () => {
  it("returns a list of public challenge metadata", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/challenges" })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
  })

  it("exposes only whitelisted public fields (no flags/hints/answers)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/challenges" })
    const first = res.json().data[0]
    expect(Object.keys(first).sort()).toEqual(
      [
        "category",
        "description",
        "difficulty",
        "estimatedMinutes",
        "points",
        "slug",
        "tags",
        "title",
      ].sort(),
    )
    // Never leak answer-adjacent or internal fields.
    expect(first).not.toHaveProperty("hints")
    expect(first).not.toHaveProperty("objectives")
    expect(first).not.toHaveProperty("id")
    expect(first).not.toHaveProperty("status")
    expect(first).not.toHaveProperty("flag")
  })
})

describe("GET /api/v1/challenges/:slug", () => {
  it("returns a single known challenge", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges/reflected-xss",
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.slug).toBe("reflected-xss")
  })

  it("returns 404 with CHALLENGE_NOT_FOUND for an unknown slug", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/challenges/does-not-exist",
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({
      error: {
        code: "CHALLENGE_NOT_FOUND",
        message: "Challenge not found",
        status: 404,
      },
    })
  })
})

describe("GET /api/v1/learning", () => {
  it("returns a list of public learning-path metadata", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/learning" })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data)).toBe(true)
  })

  it("returns 404 with LEARNING_PATH_NOT_FOUND for an unknown slug", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/learning/nope",
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("LEARNING_PATH_NOT_FOUND")
  })
})

describe("GET /api/v1/missions", () => {
  it("returns a list of public mission metadata", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/missions" })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data)).toBe(true)
  })

  it("returns 404 with MISSION_NOT_FOUND for an unknown slug", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/missions/nope" })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("MISSION_NOT_FOUND")
  })
})

describe("progress stub", () => {
  it("GET /api/v1/progress returns 501", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/progress" })
    expect(res.statusCode).toBe(501)
    expect(res.json().error.code).toBe("PROGRESS_SERVICE_NOT_IMPLEMENTED")
  })
})

describe("flag stub", () => {
  it("POST /api/v1/flags/submit returns 501 and never 'correct'", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/flags/submit",
      payload: { flag: "CYV{whatever}" },
    })
    expect(res.statusCode).toBe(501)
    expect(res.json()).toEqual({
      error: {
        code: "FLAG_SERVICE_NOT_IMPLEMENTED",
        message: "Flag validation is not implemented yet",
        status: 501,
      },
    })
    expect(res.body).not.toContain("correct")
  })
})

describe("safety: no external network or command execution", () => {
  it("serving the catalog performs no outbound fetch", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => {
        throw new Error("network access is forbidden in Phase 7")
      })

    await app.inject({ method: "GET", url: "/api/v1/challenges" })
    await app.inject({ method: "GET", url: "/api/v1/learning" })
    await app.inject({ method: "GET", url: "/api/v1/missions" })

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("unknown routes return the standard 404 envelope", async () => {
    const res = await app.inject({ method: "GET", url: "/totally/unknown" })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Resource not found", status: 404 },
    })
  })
})
