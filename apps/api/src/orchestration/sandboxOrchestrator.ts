/**
 * Sandbox orchestrator (Phase 10).
 *
 * The single place sandbox provisioning/lifecycle policy is coordinated. It sits
 * BETWEEN the control-plane environment records and the runtime-provider seam:
 *
 *   route → environmentService (ownership/record) → sandboxOrchestrator (policy,
 *           runtime invocation, audit, timeouts, idempotency) → runtimeProvider
 *
 * SECURITY / HONESTY GUARANTEES (Phase 10):
 *   - It executes NOTHING itself: no shell, no child process, no Docker, no
 *     namespaces, no host filesystem access, no arbitrary fetch. It only calls
 *     the injected `EnvironmentRuntimeProvider` interface.
 *   - It NEVER claims a runtime exists unless the provider confirms it. When the
 *     provider reports RUNTIME_NOT_CONFIGURED it returns a controlled
 *     SANDBOX_RUNTIME_UNAVAILABLE error and emits an audit event — it never
 *     fabricates READY/ACTIVE state.
 *   - Every policy is server-authoritative and validated before any runtime call.
 *   - Responses use SAFE DTOs only (no runtime ids/hostnames/paths/metadata).
 *
 * The `notConfiguredRuntimeProvider` wired in Phase 10 means provision/start/
 * reset always resolve to SANDBOX_RUNTIME_UNAVAILABLE, while stop/destroy are
 * safe no-ops (there is nothing running to tear down).
 */
import type { EnvironmentRecord } from "../domain/environment.ts"
import type { AuditRepository } from "../repositories/types.ts"
import type { EnvironmentRuntimeProvider } from "../services/runtime/environmentRuntimeProvider.ts"
import {
  policyRejected,
  provisionFailed,
  runtimeUnavailable,
  sandboxTimeout,
} from "./sandboxErrors.ts"
import { DEFAULT_SANDBOX_POLICY, resolveSandboxPolicy } from "./sandboxPolicy.ts"
import type {
  SandboxAuditEvent,
  SandboxDescriptorDTO,
  SandboxPolicy,
  SandboxProvisionRequest,
} from "./sandboxTypes.ts"

/** Non-sensitive audit context; mirrors the environment service's AuthContext. */
export interface SandboxAuditContext {
  userId?: string | null
  ip?: string | null
  userAgent?: string | null
}

/** Server-authoritative operation deadlines (ms). Never client-controlled. */
export interface SandboxDeadlines {
  provisionMs: number
  startMs: number
  stopMs: number
  resetMs: number
  destroyMs: number
}

export const DEFAULT_SANDBOX_DEADLINES: SandboxDeadlines = {
  provisionMs: 30_000,
  startMs: 15_000,
  stopMs: 15_000,
  resetMs: 20_000,
  destroyMs: 15_000,
}

export interface SandboxOrchestratorDeps {
  runtime: EnvironmentRuntimeProvider
  audit: AuditRepository
  deadlines?: SandboxDeadlines
}

export interface SandboxOrchestrator {
  /** True only when a real runtime provider is configured (false in Phase 10). */
  readonly runtimeAvailable: boolean
  /** Read-only: resolve + return the safe policy descriptor. No runtime call. */
  describeSandbox(
    env: EnvironmentRecord,
    request?: SandboxProvisionRequest,
  ): SandboxDescriptorDTO
  provision(
    env: EnvironmentRecord,
    request?: SandboxProvisionRequest,
    ctx?: SandboxAuditContext,
    idempotencyKey?: string | null,
  ): Promise<SandboxDescriptorDTO>
  start(env: EnvironmentRecord, ctx?: SandboxAuditContext): Promise<SandboxDescriptorDTO>
  stop(env: EnvironmentRecord, ctx?: SandboxAuditContext): Promise<SandboxDescriptorDTO>
  reset(env: EnvironmentRecord, ctx?: SandboxAuditContext): Promise<SandboxDescriptorDTO>
  destroy(env: EnvironmentRecord, ctx?: SandboxAuditContext): Promise<SandboxDescriptorDTO>
}

/** A sentinel used to detect a deadline before a runtime call resolves. */
const TIMEOUT = Symbol("sandbox-timeout")

async function withDeadline<T>(op: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), ms)
  })
  try {
    return await Promise.race([op, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Build the SAFE descriptor. Whitelists only shippable fields — never leaks
 * runtime ids, hostnames, node addresses, internal IPs, filesystem paths,
 * container ids, provider metadata, or the resolved egress destinations. */
function toDescriptor(
  env: EnvironmentRecord,
  policy: SandboxPolicy,
  runtimeAvailable: boolean,
): SandboxDescriptorDTO {
  return {
    environmentId: env.id,
    runtimeAvailable,
    policy: {
      resources: { ...policy.resources },
      network: {
        ingress: policy.network.ingress,
        egress: policy.network.egress,
        allowedDestinationCount: policy.network.allowedDestinations.length,
      },
      capabilities: { ...policy.capabilities },
      filesystem: {
        readOnlyRootFilesystem: policy.filesystem.readOnlyRootFilesystem,
        allowHostMounts: policy.filesystem.allowHostMounts,
        writablePathCount: policy.filesystem.writablePaths.length,
      },
    },
  }
}

export function createSandboxOrchestrator(
  deps: SandboxOrchestratorDeps,
): SandboxOrchestrator {
  const { runtime, audit } = deps
  const deadlines = deps.deadlines ?? DEFAULT_SANDBOX_DEADLINES

  // Per-process idempotency for successful provisions, keyed by env+key. A
  // repeated key returns the cached descriptor instead of re-invoking the
  // runtime (mirrors the Phase 9 create idempotency design).
  const provisioned = new Map<string, SandboxDescriptorDTO>()

  async function emit(
    event: SandboxAuditEvent,
    env: EnvironmentRecord,
    ctx?: SandboxAuditContext,
  ): Promise<void> {
    await audit.record({
      event,
      userId: ctx?.userId ?? env.userId,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    })
  }

  /** Resolve+validate a policy; audit + throw on rejection. */
  async function requirePolicy(
    env: EnvironmentRecord,
    request: SandboxProvisionRequest | undefined,
    ctx: SandboxAuditContext | undefined,
  ): Promise<SandboxPolicy> {
    const resolution = resolveSandboxPolicy(request ?? {})
    if (!resolution.ok) {
      await emit("SANDBOX_POLICY_REJECTED", env, ctx)
      throw policyRejected(resolution.reasons)
    }
    return resolution.policy
  }

  return {
    runtimeAvailable: runtime.configured,

    describeSandbox(env, request): SandboxDescriptorDTO {
      const resolution = resolveSandboxPolicy(request ?? {})
      if (!resolution.ok) throw policyRejected(resolution.reasons)
      return toDescriptor(env, resolution.policy, runtime.configured)
    },

    async provision(env, request, ctx, idempotencyKey): Promise<SandboxDescriptorDTO> {
      await emit("SANDBOX_PROVISION_REQUESTED", env, ctx)

      const key = idempotencyKey?.trim() || null
      const cacheKey = key ? `${env.id}::${key}` : null
      if (cacheKey) {
        const cached = provisioned.get(cacheKey)
        if (cached) return cached
      }

      const policy = await requirePolicy(env, request, ctx)

      if (!runtime.configured) {
        // Never fake READY. Preserve the environment; return a controlled error.
        await emit("SANDBOX_RUNTIME_UNAVAILABLE", env, ctx)
        throw runtimeUnavailable()
      }

      await emit("SANDBOX_PROVISION_STARTED", env, ctx)
      const result = await withDeadline(runtime.provision(env), deadlines.provisionMs)
      if (result === TIMEOUT) {
        await emit("SANDBOX_TIMEOUT", env, ctx)
        throw sandboxTimeout()
      }
      if (!result.ok) {
        await emit("SANDBOX_RUNTIME_UNAVAILABLE", env, ctx)
        throw provisionFailed()
      }
      await emit("SANDBOX_READY", env, ctx)
      const descriptor = toDescriptor(env, policy, true)
      if (cacheKey) provisioned.set(cacheKey, descriptor)
      return descriptor
    },

    async start(env, ctx): Promise<SandboxDescriptorDTO> {
      await emit("SANDBOX_START_REQUESTED", env, ctx)
      const policy = DEFAULT_SANDBOX_POLICY
      if (!runtime.configured) {
        await emit("SANDBOX_RUNTIME_UNAVAILABLE", env, ctx)
        throw runtimeUnavailable()
      }
      const result = await withDeadline(runtime.start(env), deadlines.startMs)
      if (result === TIMEOUT) {
        await emit("SANDBOX_TIMEOUT", env, ctx)
        throw sandboxTimeout()
      }
      if (!result.ok) {
        await emit("SANDBOX_RUNTIME_UNAVAILABLE", env, ctx)
        throw provisionFailed()
      }
      await emit("SANDBOX_STARTED", env, ctx)
      return toDescriptor(env, policy, true)
    },

    async reset(env, ctx): Promise<SandboxDescriptorDTO> {
      await emit("SANDBOX_RESET_REQUESTED", env, ctx)
      if (!runtime.configured) {
        await emit("SANDBOX_RUNTIME_UNAVAILABLE", env, ctx)
        throw runtimeUnavailable()
      }
      const result = await withDeadline(runtime.reset(env), deadlines.resetMs)
      if (result === TIMEOUT) {
        await emit("SANDBOX_TIMEOUT", env, ctx)
        throw sandboxTimeout()
      }
      if (!result.ok) {
        await emit("SANDBOX_RUNTIME_UNAVAILABLE", env, ctx)
        throw provisionFailed()
      }
      await emit("SANDBOX_RESET", env, ctx)
      return toDescriptor(env, DEFAULT_SANDBOX_POLICY, true)
    },

    async stop(env, ctx): Promise<SandboxDescriptorDTO> {
      await emit("SANDBOX_STOP_REQUESTED", env, ctx)
      // Idempotent teardown: with no runtime there is nothing to stop, so a
      // repeated/absent-runtime stop is a safe no-op (never an inconsistent state).
      if (runtime.configured) {
        const result = await withDeadline(runtime.stop(env), deadlines.stopMs)
        if (result === TIMEOUT) {
          await emit("SANDBOX_TIMEOUT", env, ctx)
          throw sandboxTimeout()
        }
      }
      await emit("SANDBOX_STOPPED", env, ctx)
      return toDescriptor(env, DEFAULT_SANDBOX_POLICY, runtime.configured)
    },

    async destroy(env, ctx): Promise<SandboxDescriptorDTO> {
      await emit("SANDBOX_DESTROY_REQUESTED", env, ctx)
      // Idempotent teardown: safe no-op when no runtime exists. Clears any cached
      // provision so a later provision does not reuse a stale descriptor.
      for (const k of [...provisioned.keys()]) {
        if (k.startsWith(`${env.id}::`)) provisioned.delete(k)
      }
      if (runtime.configured) {
        const result = await withDeadline(runtime.destroy(env), deadlines.destroyMs)
        if (result === TIMEOUT) {
          await emit("SANDBOX_TIMEOUT", env, ctx)
          throw sandboxTimeout()
        }
      }
      await emit("SANDBOX_DESTROYED", env, ctx)
      return toDescriptor(env, DEFAULT_SANDBOX_POLICY, runtime.configured)
    },
  }
}
