import { describe, it, expect, beforeEach } from "vitest"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"
import type { Repositories, AuditEventName } from "../src/repositories/types.ts"
import { createInMemoryIdempotencyStore } from "../src/services/idempotencyStore.ts"
import { notConfiguredRuntimeProvider } from "../src/services/runtime/environmentRuntimeProvider.ts"
import { catalogService } from "../src/services/catalogService.ts"
import {
  createEnvironmentService,
  type EnvironmentActor,
  type EnvironmentService,
} from "../src/services/environmentService.ts"
import type { EnvironmentPolicy } from "../src/config/env.ts"

const POLICY: EnvironmentPolicy = {
  maxActive: 3,
  maxTotal: 5,
  ttlMinutes: 60,
  maxLifetimeMinutes: 120,
}

const USER: EnvironmentActor = { id: "user-1", roles: ["USER"] }
const OTHER: EnvironmentActor = { id: "user-2", roles: ["USER"] }
const ADMIN: EnvironmentActor = { id: "admin-1", roles: ["ADMIN"] }

const CHALLENGE = "reflected-xss"
const MISSION = "surface-recon"

interface Harness {
  service: EnvironmentService
  repos: Repositories
  events: AuditEventName[]
  setNow: (d: Date) => void
}

function makeHarness(policy: EnvironmentPolicy = POLICY): Harness {
  const base = createInMemoryRepositories()
  const events: AuditEventName[] = []
  const repos: Repositories = {
    ...base,
    audit: {
      async record(input) {
        events.push(input.event)
      },
    },
  }
  let clock = new Date("2026-01-01T00:00:00.000Z")
  const service = createEnvironmentService({
    repositories: repos,
    catalog: catalogService,
    runtime: notConfiguredRuntimeProvider,
    policy,
    idempotency: createInMemoryIdempotencyStore(() => clock.getTime()),
    now: () => clock,
  })
  return { service, repos, events, setNow: (d) => { clock = d } }
}

describe("requestEnvironment — validation & catalog", () => {
  let h: Harness
  beforeEach(() => { h = makeHarness() })

  it("creates a CHALLENGE environment for a valid slug", async () => {
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    expect(env.status).toBe("REQUESTED")
    expect(env.runtimeStatus).toBe("NOT_PROVISIONED")
    expect(env.challengeSlug).toBe(CHALLENGE)
    expect(env.missionSlug).toBeNull()
    expect(env.userId).toBe(USER.id)
    expect(h.events).toContain("ENVIRONMENT_CREATED")
  })

  it("creates a MISSION environment for a valid slug", async () => {
    const env = await h.service.requestEnvironment(USER, {
      type: "MISSION",
      missionSlug: MISSION,
    })
    expect(env.type).toBe("MISSION")
    expect(env.missionSlug).toBe(MISSION)
  })

  it("rejects an unknown type", async () => {
    await expect(
      h.service.requestEnvironment(USER, { type: "BOGUS" }),
    ).rejects.toMatchObject({ code: "INVALID_ENVIRONMENT_TARGET", status: 400 })
  })

  it("rejects a CHALLENGE with a missionSlug (mixed target)", async () => {
    await expect(
      h.service.requestEnvironment(USER, {
        type: "CHALLENGE",
        challengeSlug: CHALLENGE,
        missionSlug: MISSION,
      }),
    ).rejects.toMatchObject({ code: "INVALID_ENVIRONMENT_TARGET" })
  })

  it("rejects a challenge slug not in the catalog", async () => {
    await expect(
      h.service.requestEnvironment(USER, {
        type: "CHALLENGE",
        challengeSlug: "no-such-challenge",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ENVIRONMENT_TARGET" })
  })

  it("rejects a MISSION with no missionSlug", async () => {
    await expect(
      h.service.requestEnvironment(USER, { type: "MISSION" }),
    ).rejects.toMatchObject({ code: "INVALID_ENVIRONMENT_TARGET" })
  })
})

describe("ownership (IDOR)", () => {
  let h: Harness
  beforeEach(() => { h = makeHarness() })

  it("hides another user's environment behind a 404 (never 403)", async () => {
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    await expect(
      h.service.getEnvironment(OTHER, env.id),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_NOT_FOUND", status: 404 })
  })

  it("returns 404 for a non-existent id (indistinguishable from not-owned)", async () => {
    await expect(
      h.service.getEnvironment(USER, "missing"),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_NOT_FOUND", status: 404 })
  })

  it("lets an ADMIN read any environment", async () => {
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    const seen = await h.service.getEnvironment(ADMIN, env.id)
    expect(seen.id).toBe(env.id)
  })

  it("lists only the caller's own environments", async () => {
    await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    await h.service.requestEnvironment(OTHER, { type: "MISSION", missionSlug: MISSION })
    const mine = await h.service.listUserEnvironments(USER)
    expect(mine).toHaveLength(1)
    expect(mine[0]?.userId).toBe(USER.id)
  })
})

describe("limits", () => {
  it("rejects creation past maxActive", async () => {
    const h = makeHarness({ ...POLICY, maxActive: 2, maxTotal: 10 })
    await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    await expect(
      h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE }),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_LIMIT_REACHED", status: 409 })
  })

  it("frees a maxTotal slot once an environment is destroyed", async () => {
    const h = makeHarness({ ...POLICY, maxActive: 5, maxTotal: 2 })
    const a = await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    // Two retained → a third is refused.
    await expect(
      h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE }),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_LIMIT_REACHED" })
    // Destroying one frees a slot (DESTROYED is not retained).
    await h.service.destroyEnvironment(USER, a.id)
    const third = await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    expect(third.status).toBe("REQUESTED")
  })
})

describe("idempotent creation", () => {
  it("returns the same environment for a repeated idempotency key", async () => {
    const h = makeHarness()
    const first = await h.service.requestEnvironment(
      USER,
      { type: "CHALLENGE", challengeSlug: CHALLENGE },
      { idempotencyKey: "abc" },
    )
    const second = await h.service.requestEnvironment(
      USER,
      { type: "CHALLENGE", challengeSlug: CHALLENGE },
      { idempotencyKey: "abc" },
    )
    expect(second.id).toBe(first.id)
    expect(await h.service.listUserEnvironments(USER)).toHaveLength(1)
  })

  it("scopes idempotency keys per user (no cross-user leakage)", async () => {
    const h = makeHarness()
    const mine = await h.service.requestEnvironment(
      USER,
      { type: "CHALLENGE", challengeSlug: CHALLENGE },
      { idempotencyKey: "shared" },
    )
    const theirs = await h.service.requestEnvironment(
      OTHER,
      { type: "MISSION", missionSlug: MISSION },
      { idempotencyKey: "shared" },
    )
    expect(theirs.id).not.toBe(mine.id)
  })
})

describe("lifecycle — start / stop / reset / destroy", () => {
  let h: Harness
  beforeEach(() => { h = makeHarness() })

  async function created() {
    return h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
  }

  it("start walks REQUESTED→ACTIVE but keeps runtimeStatus NOT_PROVISIONED (honest)", async () => {
    const env = await created()
    const active = await h.service.activateEnvironment(USER, env.id)
    expect(active.status).toBe("ACTIVE")
    expect(active.runtimeStatus).toBe("NOT_PROVISIONED")
    expect(active.startedAt).not.toBeNull()
    expect(h.events).toEqual(
      expect.arrayContaining([
        "ENVIRONMENT_START_REQUESTED",
        "ENVIRONMENT_READY",
        "ENVIRONMENT_ACTIVATED",
      ]),
    )
  })

  it("start is idempotent once ACTIVE", async () => {
    const env = await created()
    const a = await h.service.activateEnvironment(USER, env.id)
    const b = await h.service.activateEnvironment(USER, env.id)
    expect(b.status).toBe("ACTIVE")
    expect(b.id).toBe(a.id)
  })

  it("stop moves ACTIVE→READY and is idempotent when already READY", async () => {
    const env = await created()
    await h.service.activateEnvironment(USER, env.id)
    const stopped = await h.service.stopEnvironment(USER, env.id)
    expect(stopped.status).toBe("READY")
    expect(stopped.startedAt).toBeNull()
    const again = await h.service.stopEnvironment(USER, env.id)
    expect(again.status).toBe("READY")
  })

  it("reset returns to READY", async () => {
    const env = await created()
    await h.service.activateEnvironment(USER, env.id)
    const reset = await h.service.resetEnvironment(USER, env.id)
    expect(reset.status).toBe("READY")
    expect(h.events).toContain("ENVIRONMENT_RESET_REQUESTED")
  })

  it("destroy reaches DESTROYED and is idempotent", async () => {
    const env = await created()
    const d1 = await h.service.destroyEnvironment(USER, env.id)
    expect(d1.status).toBe("DESTROYED")
    expect(d1.destroyedAt).not.toBeNull()
    const d2 = await h.service.destroyEnvironment(USER, env.id)
    expect(d2.status).toBe("DESTROYED")
    expect(h.events).toContain("ENVIRONMENT_DESTROYED")
  })

  it("cannot start a destroyed environment", async () => {
    const env = await created()
    await h.service.destroyEnvironment(USER, env.id)
    await expect(
      h.service.activateEnvironment(USER, env.id),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_INVALID_STATE" })
  })

  it("cannot stop an environment that was never started", async () => {
    const env = await created()
    await expect(
      h.service.stopEnvironment(USER, env.id),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_INVALID_STATE" })
  })
})

describe("TTL — touch, expiry, cleanup", () => {
  it("touch slides expiry forward, capped at maxLifetime", async () => {
    const h = makeHarness({ ...POLICY, ttlMinutes: 60, maxLifetimeMinutes: 90 })
    const start = new Date("2026-01-01T00:00:00.000Z")
    h.setNow(start)
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    // Initial expiry is min(now+60, created+90) = now+60.
    expect(env.expiresAt.toISOString()).toBe("2026-01-01T01:00:00.000Z")

    // 30 min later, sliding would be +90 but the hard cap (created+90) wins.
    h.setNow(new Date("2026-01-01T00:30:00.000Z"))
    const touched = await h.service.touchEnvironment(USER, env.id)
    expect(touched.expiresAt.toISOString()).toBe("2026-01-01T01:30:00.000Z")
  })

  it("touch on an expired environment is rejected", async () => {
    const h = makeHarness()
    h.setNow(new Date("2026-01-01T00:00:00.000Z"))
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    h.setNow(new Date("2026-01-01T05:00:00.000Z"))
    await expect(
      h.service.touchEnvironment(USER, env.id),
    ).rejects.toMatchObject({ code: "ENVIRONMENT_EXPIRED" })
  })

  it("cleanupExpiredEnvironments times out live, expired environments", async () => {
    const h = makeHarness()
    h.setNow(new Date("2026-01-01T00:00:00.000Z"))
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    const count = await h.service.cleanupExpiredEnvironments(
      new Date("2026-01-01T02:00:00.000Z"),
    )
    expect(count).toBe(1)
    const after = await h.service.getEnvironment(USER, env.id)
    expect(after.status).toBe("TIMEOUT")
    expect(h.events).toContain("ENVIRONMENT_TIMEOUT")
  })

  it("cleanup ignores environments still within their TTL", async () => {
    const h = makeHarness()
    h.setNow(new Date("2026-01-01T00:00:00.000Z"))
    await h.service.requestEnvironment(USER, { type: "CHALLENGE", challengeSlug: CHALLENGE })
    const count = await h.service.cleanupExpiredEnvironments(
      new Date("2026-01-01T00:30:00.000Z"),
    )
    expect(count).toBe(0)
  })
})

describe("system-facing failEnvironment", () => {
  it("marks an environment FAILED with a stable code", async () => {
    const h = makeHarness()
    const env = await h.service.requestEnvironment(USER, {
      type: "CHALLENGE",
      challengeSlug: CHALLENGE,
    })
    const failed = await h.service.failEnvironment(env.id, "RUNTIME_CRASH", "boom")
    expect(failed?.status).toBe("FAILED")
    expect(failed?.failureCode).toBe("RUNTIME_CRASH")
    expect(h.events).toContain("ENVIRONMENT_FAILED")
  })

  it("returns null for an unknown id", async () => {
    const h = makeHarness()
    expect(await h.service.failEnvironment("nope", "X", "y")).toBeNull()
    expect(await h.service.timeoutEnvironment("nope")).toBeNull()
  })
})


