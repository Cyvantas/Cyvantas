/**
 * Runtime provider abstraction — the seam for a FUTURE sandbox runtime.
 *
 * Phase 9 ships ONLY a "not configured" implementation. It creates no
 * containers, spawns no processes, opens no sockets, and touches no host
 * filesystem. Every method resolves to a structured, non-throwing result whose
 * `ok` is false and whose `code` is RUNTIME_NOT_CONFIGURED, so the environment
 * service can represent runtime state HONESTLY (runtimeStatus stays
 * NOT_PROVISIONED) instead of pretending a sandbox is running.
 *
 * Phase 10 will provide a real implementation of this same interface (e.g. a
 * container/sandbox orchestrator) without changing the environment service or
 * routes. Do NOT add Docker/Kubernetes/exec logic here in Phase 9.
 */
import type {
  EnvironmentRecord,
  EnvironmentRuntimeStatus,
} from "../../domain/environment.ts"

export interface RuntimeResult {
  /** Whether the runtime operation succeeded. Always false in Phase 9. */
  ok: boolean
  /** The runtime status after the operation. NOT_PROVISIONED in Phase 9. */
  runtimeStatus: EnvironmentRuntimeStatus
  /** Stable machine code when !ok (e.g. RUNTIME_NOT_CONFIGURED). */
  code?: string
  /** Human-readable, non-sensitive message. Never a stack trace. */
  message?: string
}

/**
 * The runtime provider contract. Each method takes the environment record so a
 * future provider can derive its handle/refs from persisted metadata. Methods
 * return a RuntimeResult and never throw for the "not configured" case.
 */
export interface EnvironmentRuntimeProvider {
  /** True only when a real runtime is wired up (Phase 10+). */
  readonly configured: boolean
  provision(env: EnvironmentRecord): Promise<RuntimeResult>
  start(env: EnvironmentRecord): Promise<RuntimeResult>
  stop(env: EnvironmentRecord): Promise<RuntimeResult>
  reset(env: EnvironmentRecord): Promise<RuntimeResult>
  destroy(env: EnvironmentRecord): Promise<RuntimeResult>
  status(env: EnvironmentRecord): Promise<RuntimeResult>
}

export const RUNTIME_NOT_CONFIGURED = "RUNTIME_NOT_CONFIGURED"

function notConfigured(): RuntimeResult {
  return {
    ok: false,
    runtimeStatus: "NOT_PROVISIONED",
    code: RUNTIME_NOT_CONFIGURED,
    message: "No environment runtime is configured.",
  }
}

/**
 * The only provider available in Phase 9. It provisions/starts/stops NOTHING
 * and reports NOT_PROVISIONED for every call. `configured` is false so callers
 * can surface an honest signal to clients.
 */
export const notConfiguredRuntimeProvider: EnvironmentRuntimeProvider = {
  configured: false,
  async provision() {
    return notConfigured()
  },
  async start() {
    return notConfigured()
  },
  async stop() {
    return notConfigured()
  },
  async reset() {
    return notConfigured()
  },
  async destroy() {
    return notConfigured()
  },
  async status() {
    return notConfigured()
  },
}
