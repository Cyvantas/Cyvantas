/**
 * Challenge service unit tests (Phase 11).
 *
 * Exercises the business logic directly over the in-memory repositories, the
 * not-configured runtime seam, and an injected flag/clock — no HTTP, no
 * database, no runtime. A synthetic actor is used: environmentService keys off
 * actor.id, so no real user row is required.
 */
import { describe, it, expect } from "vitest"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"
import { createEnvironmentService, type EnvironmentActor } from "../src/services/environmentService.ts"
import { createChallengeService } from "../src/services/challengeService.ts"
import { createChallengeRegistry } from "../src/challenges/index.ts"
import { catalogService } from "../src/services/catalogService.ts"
import { notConfiguredRuntimeProvider } from "../src/services/runtime/environmentRuntimeProvider.ts"
import { createInMemoryIdempotencyStore } from "../src/services/idempotencyStore.ts"

const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
const SLUG = "reflected-xss"
const FLAG = "CYVANTAS{unit_test_flag_value}"

const actor: EnvironmentActor = { id: "user-unit-1", roles: [] }
const otherActor: EnvironmentActor = { id: "user-unit-2", roles: [] }

function build(now?: () => Date) {
  const repositories = createInMemoryRepositories()
  const environments = createEnvironmentService({
    repositories,
    catalog: catalogService,
    runtime: notConfiguredRuntimeProvider,
    policy: config.environment,
    idempotency: createInMemoryIdempotencyStore(),
    now,
  })
  const service = createChallengeService({
    environments,
    catalog: catalogService,
    registry: createChallengeRegistry({ CHALLENGE_REFLECTED_XSS_FLAG: FLAG } as NodeJS.ProcessEnv),
    audit: repositories.audit,
    progress: repositories.progress,
    now,
  })
  return { service, environments, repositories }
}

describe("challengeService — environment lifecycle", () => {
  it("stays REQUESTED and reports runtime not configured (never fakes READY)", async () => {
    const { service } = build()
    const view = await service.createEnvironment(actor, SLUG)
    expect(view.status).toBe("REQUESTED")
    expect(view.runtimeStatus).toBe("NOT_PROVISIONED")
    expect(view.runtimeConfigured).toBe(false)
    expect(view.serviceUrl).toBeNull()
    expect(view.challengeSlug).toBe(SLUG)
  })

  it("rejects an unknown challenge slug with CHALLENGE_NOT_FOUND", async () => {
    const { service } = build()
    await expect(service.createEnvironment(actor, "no-such-challenge")).rejects.toMatchObject({
      code: "CHALLENGE_NOT_FOUND",
      status: 404,
    })
  })

  it("returns 404 (ownership) when another actor reads the environment", async () => {
    const { service } = build()
    const view = await service.createEnvironment(actor, SLUG)
    await expect(
      service.getEnvironment(otherActor, SLUG, view.environmentId),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_NOT_FOUND", status: 404 })
  })

  it("rejects an environment provisioned for a different challenge (association)", async () => {
    const { service, environments } = build()
    const env = await environments.requestEnvironment(actor, {
      type: "MISSION",
      challengeSlug: null,
      missionSlug: "surface-recon",
    })
    await expect(
      service.getEnvironment(actor, SLUG, env.id),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_CHALLENGE_MISMATCH", status: 400 })
  })
})

describe("challengeService — submission verification", () => {
  it("returns { correct: true } for the exact server-side flag", async () => {
    const { service } = build()
    const env = await service.createEnvironment(actor, SLUG)
    const result = await service.submit(actor, SLUG, {
      environmentId: env.environmentId,
      answer: FLAG,
    })
    expect(result).toEqual({ correct: true })
  })

  it("returns { correct: false } for a wrong answer", async () => {
    const { service } = build()
    const env = await service.createEnvironment(actor, SLUG)
    const result = await service.submit(actor, SLUG, {
      environmentId: env.environmentId,
      answer: "CYVANTAS{not_the_flag}",
    })
    expect(result).toEqual({ correct: false })
  })

  it("returns { correct: false } for a wrong-length prefix (no partial match)", async () => {
    const { service } = build()
    const env = await service.createEnvironment(actor, SLUG)
    const result = await service.submit(actor, SLUG, {
      environmentId: env.environmentId,
      answer: FLAG.slice(0, 10),
    })
    expect(result).toEqual({ correct: false })
  })

  it("records completion progress only on a correct submission", async () => {
    const { service, repositories } = build()
    const env = await service.createEnvironment(actor, SLUG)
    await service.submit(actor, SLUG, { environmentId: env.environmentId, answer: FLAG })
    const progress = await repositories.progress.listForUser("challenge", actor.id)
    expect(progress).toEqual([{ slug: SLUG, status: "completed", completedAt: expect.any(Date) }])
  })

  it("does not record progress on a wrong submission", async () => {
    const { service, repositories } = build()
    const env = await service.createEnvironment(actor, SLUG)
    await service.submit(actor, SLUG, { environmentId: env.environmentId, answer: "wrong" })
    const progress = await repositories.progress.listForUser("challenge", actor.id)
    expect(progress).toEqual([])
  })

  it("rejects an empty answer with INVALID_SUBMISSION", async () => {
    const { service } = build()
    const env = await service.createEnvironment(actor, SLUG)
    await expect(
      service.submit(actor, SLUG, { environmentId: env.environmentId, answer: "   " }),
    ).rejects.toMatchObject({ code: "INVALID_SUBMISSION", status: 400 })
  })

  it("rejects an oversized answer with INVALID_SUBMISSION", async () => {
    const { service } = build()
    const env = await service.createEnvironment(actor, SLUG)
    await expect(
      service.submit(actor, SLUG, { environmentId: env.environmentId, answer: "a".repeat(513) }),
    ).rejects.toMatchObject({ code: "INVALID_SUBMISSION", status: 400 })
  })

  it("rejects submission against a non-owned environment with 404", async () => {
    const { service } = build()
    const env = await service.createEnvironment(actor, SLUG)
    await expect(
      service.submit(otherActor, SLUG, { environmentId: env.environmentId, answer: FLAG }),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_NOT_FOUND", status: 404 })
  })

  it("rejects submission when the environment is destroyed (409)", async () => {
    const { service, environments } = build()
    const env = await service.createEnvironment(actor, SLUG)
    await environments.destroyEnvironment(actor, env.environmentId)
    await expect(
      service.submit(actor, SLUG, { environmentId: env.environmentId, answer: FLAG }),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_INVALID_STATE", status: 409 })
  })

  it("rejects submission when the environment has expired (409)", async () => {
    const created = build()
    const env = await created.service.createEnvironment(actor, SLUG)
    // A second service view over the SAME repositories, but with a clock far in
    // the future so the existing environment is past its expiry.
    const future = createChallengeService({
      environments: created.environments,
      catalog: catalogService,
      registry: createChallengeRegistry({ CHALLENGE_REFLECTED_XSS_FLAG: FLAG } as NodeJS.ProcessEnv),
      audit: created.repositories.audit,
      progress: created.repositories.progress,
      now: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    })
    await expect(
      future.submit(actor, SLUG, { environmentId: env.environmentId, answer: FLAG }),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_EXPIRED", status: 409 })
  })
})

describe("challengeService — flag never leaks", () => {
  it("never places the flag in the environment view or the result", async () => {
    const { service } = build()
    const view = await service.createEnvironment(actor, SLUG)
    expect(JSON.stringify(view)).not.toContain(FLAG)
    const ok = await service.submit(actor, SLUG, { environmentId: view.environmentId, answer: FLAG })
    expect(JSON.stringify(ok)).not.toContain(FLAG)
    const bad = await service.submit(actor, SLUG, { environmentId: view.environmentId, answer: "x" })
    expect(JSON.stringify(bad)).not.toContain(FLAG)
  })
})
