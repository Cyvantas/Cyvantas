/**
 * Security regression tests (Phase 10, requirement 15).
 *
 * These prove the ARCHITECTURAL ABSENCE of any execution capability in the
 * sandbox orchestration layer. They never attempt dangerous execution; they
 * assert that the source itself cannot execute a shell command, spawn a child
 * process, invoke Docker, touch the host filesystem or a Docker socket, or make
 * arbitrary network calls. The only I/O seam the orchestrator has is the
 * injected EnvironmentRuntimeProvider interface — and in this build that seam is
 * the "not configured" provider, which does nothing.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createSandboxOrchestrator } from "../src/orchestration/index.ts"
import { notConfiguredRuntimeProvider } from "../src/services/runtime/environmentRuntimeProvider.ts"
import type { AuditRepository } from "../src/repositories/types.ts"
import type { EnvironmentRecord } from "../src/domain/environment.ts"

const here = dirname(fileURLToPath(import.meta.url))
const orchestrationDir = join(here, "..", "src", "orchestration")

function orchestrationSources(): Array<{ file: string; text: string }> {
  return readdirSync(orchestrationDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({ file: f, text: readFileSync(join(orchestrationDir, f), "utf8") }))
}

// Modules that would grant real execution / host access / arbitrary network.
const FORBIDDEN_IMPORTS = [
  "child_process",
  "node:child_process",
  "dockerode",
  "node-docker-api",
  "@kubernetes/client-node",
  "net",
  "node:net",
  "dgram",
  "node:dgram",
  "tls",
  "node:tls",
]

// Call patterns that would execute code or reach out over the network.
const FORBIDDEN_CALLS = [
  /\bexec(?:Sync|File)?\s*\(/,
  /\bspawn(?:Sync)?\s*\(/,
  /\bfork\s*\(/,
  /\bfetch\s*\(/,
  /\brequire\s*\(\s*["']child_process["']\s*\)/,
  /docker\.sock/i,
  /\/var\/run\/docker/i,
]

describe("sandbox orchestration — no execution primitives in source", () => {
  it("imports no process/container/socket modules", () => {
    for (const { file, text } of orchestrationSources()) {
      for (const mod of FORBIDDEN_IMPORTS) {
        const pattern = new RegExp(`from\\s+["']${mod.replace(/[/]/g, "\\/")}["']`)
        expect(pattern.test(text), `${file} must not import ${mod}`).toBe(false)
      }
    }
  })

  it("contains no shell/spawn/fetch/docker-socket call sites", () => {
    for (const { file, text } of orchestrationSources()) {
      // Strip comments so documentation mentioning these words never trips the
      // scan — only real call sites matter.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
      for (const pattern of FORBIDDEN_CALLS) {
        expect(pattern.test(code), `${file} must not contain ${pattern}`).toBe(false)
      }
    }
  })

  it("does not import the Docker/K8s or fs-write host surface", () => {
    for (const { file, text } of orchestrationSources()) {
      expect(text.includes('from "node:fs"'), `${file} must not import node:fs`).toBe(false)
      expect(text.includes('from "fs"'), `${file} must not import fs`).toBe(false)
    }
  })
})

describe("sandbox orchestrator — behavioral proof of no runtime side effects", () => {
  function env(): EnvironmentRecord {
    const now = new Date("2026-01-01T00:00:00.000Z")
    return {
      id: "env-sec", userId: "u", type: "CHALLENGE", challengeSlug: "reflected-xss",
      missionSlug: null, status: "REQUESTED", runtimeStatus: "NOT_PROVISIONED",
      requestedAt: now, provisioningStartedAt: null, readyAt: null, startedAt: null,
      lastActivityAt: now, expiresAt: new Date("2026-01-01T01:00:00.000Z"), timeoutAt: null,
      destroyedAt: null, failureCode: null, failureMessage: null, metadata: {},
      createdAt: now, updatedAt: now,
    }
  }
  const audit: AuditRepository = { async record() {} }

  it("with the not-configured runtime it can never report a live sandbox", async () => {
    const orch = createSandboxOrchestrator({ runtime: notConfiguredRuntimeProvider, audit })
    expect(orch.runtimeAvailable).toBe(false)
    await expect(orch.provision(env())).rejects.toMatchObject({ code: "SANDBOX_RUNTIME_UNAVAILABLE" })
    await expect(orch.start(env())).rejects.toMatchObject({ code: "SANDBOX_RUNTIME_UNAVAILABLE" })
    await expect(orch.reset(env())).rejects.toMatchObject({ code: "SANDBOX_RUNTIME_UNAVAILABLE" })
    // describe is read-only and honest.
    expect(orch.describeSandbox(env()).runtimeAvailable).toBe(false)
  })

  it("only ever touches the injected runtime seam — nothing else", async () => {
    const touched: string[] = []
    const spyRuntime = {
      configured: true,
      async provision() { touched.push("provision"); return { ok: true, runtimeStatus: "RUNNING" as const } },
      async start() { touched.push("start"); return { ok: true, runtimeStatus: "RUNNING" as const } },
      async stop() { touched.push("stop"); return { ok: true, runtimeStatus: "STOPPED" as const } },
      async reset() { touched.push("reset"); return { ok: true, runtimeStatus: "RUNNING" as const } },
      async destroy() { touched.push("destroy"); return { ok: true, runtimeStatus: "STOPPED" as const } },
      async status() { return { ok: true, runtimeStatus: "RUNNING" as const } },
    }
    const orch = createSandboxOrchestrator({ runtime: spyRuntime, audit })
    await orch.provision(env())
    // Provisioning delegates to the seam and nowhere else.
    expect(touched).toEqual(["provision"])
  })
})
