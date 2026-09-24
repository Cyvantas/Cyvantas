import { describe, it, expect } from "vitest"
import { createSandboxOrchestrator } from "../src/orchestration/index.ts"
import type { AuditEventName, AuditRepository } from "../src/repositories/types.ts"
import type { EnvironmentRecord } from "../src/domain/environment.ts"
import type {
  EnvironmentRuntimeProvider,
  RuntimeResult,
} from "../src/services/runtime/environmentRuntimeProvider.ts"
import { notConfiguredRuntimeProvider } from "../src/services/runtime/environmentRuntimeProvider.ts"

function makeEnv(overrides: Partial<EnvironmentRecord> = {}): EnvironmentRecord {
  const now = new Date("2026-01-01T00:00:00.000Z")
  return {
    id: "env-1",
    userId: "user-1",
    type: "CHALLENGE",
    challengeSlug: "reflected-xss",
    missionSlug: null,
    status: "REQUESTED",
    runtimeStatus: "NOT_PROVISIONED",
    requestedAt: now,
    provisioningStartedAt: null,
    readyAt: null,
    startedAt: null,
    lastActivityAt: now,
    expiresAt: new Date("2026-01-01T01:00:00.000Z"),
    timeoutAt: null,
    destroyedAt: null,
    failureCode: null,
    failureMessage: null,
    metadata: { secretHandle: "should-never-leak", nodeIp: "10.0.0.9" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

interface Harness {
  events: AuditEventName[]
  audit: AuditRepository
  runtimeCalls: string[]
}

function makeAudit(): Harness {
  const events: AuditEventName[] = []
  const runtimeCalls: string[] = []
  return {
    events,
    runtimeCalls,
    audit: { async record(input) { events.push(input.event) } },
  }
}

function okResult(): RuntimeResult {
  return { ok: true, runtimeStatus: "RUNNING" }
}

/** A test-only CONFIGURED provider. It performs NO real work — it just returns
 * structured results — so lifecycle/idempotency can be exercised without any
 * container, process, or network. Never used in app wiring. */
function configuredStub(runtimeCalls: string[]): EnvironmentRuntimeProvider {
  return {
    configured: true,
    async provision() { runtimeCalls.push("provision"); return okResult() },
    async start() { runtimeCalls.push("start"); return okResult() },
    async stop() { runtimeCalls.push("stop"); return { ok: true, runtimeStatus: "STOPPED" } },
    async reset() { runtimeCalls.push("reset"); return okResult() },
    async destroy() { runtimeCalls.push("destroy"); return { ok: true, runtimeStatus: "STOPPED" } },
    async status() { return okResult() },
  }
}

describe("orchestrator — runtime unavailable (honest, Phase 10 default)", () => {
  it("provision returns SANDBOX_RUNTIME_UNAVAILABLE and never fakes READY", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: notConfiguredRuntimeProvider, audit: h.audit })
    await expect(orch.provision(makeEnv())).rejects.toMatchObject({
      code: "SANDBOX_RUNTIME_UNAVAILABLE",
      status: 503,
    })
    expect(h.events).toContain("SANDBOX_PROVISION_REQUESTED")
    expect(h.events).toContain("SANDBOX_RUNTIME_UNAVAILABLE")
    // It must NOT claim readiness.
    expect(h.events).not.toContain("SANDBOX_READY")
    expect(h.events).not.toContain("SANDBOX_PROVISION_STARTED")
  })

  it("start/reset are also unavailable without a runtime", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: notConfiguredRuntimeProvider, audit: h.audit })
    await expect(orch.start(makeEnv())).rejects.toMatchObject({ code: "SANDBOX_RUNTIME_UNAVAILABLE" })
    await expect(orch.reset(makeEnv())).rejects.toMatchObject({ code: "SANDBOX_RUNTIME_UNAVAILABLE" })
  })

  it("stop/destroy are safe no-ops (nothing to tear down)", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: notConfiguredRuntimeProvider, audit: h.audit })
    const stopped = await orch.stop(makeEnv())
    expect(stopped.runtimeAvailable).toBe(false)
    expect(h.events).toContain("SANDBOX_STOPPED")
    const destroyed = await orch.destroy(makeEnv())
    expect(destroyed.runtimeAvailable).toBe(false)
    expect(h.events).toContain("SANDBOX_DESTROYED")
  })

  it("reports runtimeAvailable=false", () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: notConfiguredRuntimeProvider, audit: h.audit })
    expect(orch.runtimeAvailable).toBe(false)
    expect(orch.describeSandbox(makeEnv()).runtimeAvailable).toBe(false)
  })
})

describe("orchestrator — policy rejection precedes any runtime call", () => {
  it("rejects an unsafe policy with SANDBOX_POLICY_REJECTED and audits it", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: configuredStub(h.runtimeCalls), audit: h.audit })
    await expect(
      orch.provision(makeEnv(), { capabilities: { allowPrivileged: true } }),
    ).rejects.toMatchObject({ code: "SANDBOX_POLICY_REJECTED", status: 422 })
    expect(h.events).toContain("SANDBOX_POLICY_REJECTED")
    // The runtime is never touched when the policy is rejected.
    expect(h.runtimeCalls).toHaveLength(0)
    expect(h.events).not.toContain("SANDBOX_PROVISION_STARTED")
  })

  it("attaches non-sensitive reasons to the error", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: configuredStub(h.runtimeCalls), audit: h.audit })
    await orch.provision(makeEnv(), { resources: { memoryMb: 1 << 30 } }).catch((e: unknown) => {
      expect((e as { reasons: string[] }).reasons).toContain("MEMORY_LIMIT_EXCEEDED")
    })
  })
})

describe("orchestrator — lifecycle with a configured (stub) runtime", () => {
  it("provision → READY emits the expected audit trail", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: configuredStub(h.runtimeCalls), audit: h.audit })
    const d = await orch.provision(makeEnv())
    expect(d.runtimeAvailable).toBe(true)
    expect(h.runtimeCalls).toEqual(["provision"])
    expect(h.events).toEqual(
      expect.arrayContaining([
        "SANDBOX_PROVISION_REQUESTED",
        "SANDBOX_PROVISION_STARTED",
        "SANDBOX_READY",
      ]),
    )
  })

  it("start/stop/reset/destroy emit their lifecycle events", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: configuredStub(h.runtimeCalls), audit: h.audit })
    await orch.start(makeEnv())
    await orch.stop(makeEnv())
    await orch.reset(makeEnv())
    await orch.destroy(makeEnv())
    expect(h.events).toEqual(
      expect.arrayContaining([
        "SANDBOX_START_REQUESTED", "SANDBOX_STARTED",
        "SANDBOX_STOP_REQUESTED", "SANDBOX_STOPPED",
        "SANDBOX_RESET_REQUESTED", "SANDBOX_RESET",
        "SANDBOX_DESTROY_REQUESTED", "SANDBOX_DESTROYED",
      ]),
    )
  })
})

describe("orchestrator — idempotency", () => {
  it("a repeated provision key returns the same descriptor without re-invoking the runtime", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: configuredStub(h.runtimeCalls), audit: h.audit })
    const first = await orch.provision(makeEnv(), {}, undefined, "key-1")
    const second = await orch.provision(makeEnv(), {}, undefined, "key-1")
    expect(second).toEqual(first)
    // provision was only actually run once.
    expect(h.runtimeCalls.filter((c) => c === "provision")).toHaveLength(1)
  })

  it("repeated stop and destroy stay consistent (idempotent no-ops)", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: notConfiguredRuntimeProvider, audit: h.audit })
    await orch.stop(makeEnv())
    await orch.stop(makeEnv())
    await orch.destroy(makeEnv())
    await orch.destroy(makeEnv())
    // All calls resolve without throwing; no inconsistent state.
    expect(h.events.filter((e) => e === "SANDBOX_STOPPED")).toHaveLength(2)
    expect(h.events.filter((e) => e === "SANDBOX_DESTROYED")).toHaveLength(2)
  })
})

describe("orchestrator — timeouts", () => {
  it("provisioning past the deadline yields SANDBOX_TIMEOUT", async () => {
    const h = makeAudit()
    const hangingRuntime: EnvironmentRuntimeProvider = {
      configured: true,
      provision() { return new Promise<RuntimeResult>(() => {}) }, // never resolves
      async start() { return okResult() },
      async stop() { return okResult() },
      async reset() { return okResult() },
      async destroy() { return okResult() },
      async status() { return okResult() },
    }
    const orch = createSandboxOrchestrator({
      runtime: hangingRuntime,
      audit: h.audit,
      deadlines: { provisionMs: 20, startMs: 20, stopMs: 20, resetMs: 20, destroyMs: 20 },
    })
    await expect(orch.provision(makeEnv())).rejects.toMatchObject({
      code: "SANDBOX_TIMEOUT",
      status: 504,
    })
    expect(h.events).toContain("SANDBOX_TIMEOUT")
  })
})

describe("orchestrator — failed provisioning", () => {
  it("maps a provider failure to SANDBOX_PROVISION_FAILED without leaking detail", async () => {
    const h = makeAudit()
    const failing: EnvironmentRuntimeProvider = {
      configured: true,
      async provision() {
        return { ok: false, runtimeStatus: "FAILED", code: "SECRET_INTERNAL", message: "stack trace here" }
      },
      async start() { return okResult() },
      async stop() { return okResult() },
      async reset() { return okResult() },
      async destroy() { return okResult() },
      async status() { return okResult() },
    }
    const orch = createSandboxOrchestrator({ runtime: failing, audit: h.audit })
    await orch.provision(makeEnv()).catch((e: unknown) => {
      const err = e as { code: string; message: string }
      expect(err.code).toBe("SANDBOX_PROVISION_FAILED")
      // The provider's internal code/message must not surface.
      expect(err.message).not.toContain("SECRET_INTERNAL")
      expect(err.message).not.toContain("stack trace")
    })
  })
})

describe("orchestrator — safe DTO (no secret leakage)", () => {
  it("descriptor never exposes userId, metadata, node ip, or destinations", async () => {
    const h = makeAudit()
    const orch = createSandboxOrchestrator({ runtime: configuredStub(h.runtimeCalls), audit: h.audit })
    const d = orch.describeSandbox(makeEnv(), {
      capabilities: { allowNetwork: true },
      network: { egress: "allowlist", allowedDestinations: ["example.com", "8.8.8.8"] },
    })
    const serialized = JSON.stringify(d)
    expect(serialized).not.toContain("user-1")
    expect(serialized).not.toContain("secretHandle")
    expect(serialized).not.toContain("should-never-leak")
    expect(serialized).not.toContain("10.0.0.9")
    // The concrete destinations are summarized as a count, not listed.
    expect(serialized).not.toContain("example.com")
    expect(serialized).not.toContain("8.8.8.8")
    expect(d.policy.network.allowedDestinationCount).toBe(2)
    expect(d).not.toHaveProperty("userId")
    expect(d).not.toHaveProperty("metadata")
  })
})
