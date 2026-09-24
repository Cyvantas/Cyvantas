/**
 * Sandbox orchestration module (Phase 10).
 *
 * Public surface for the orchestration layer. Everything below the seam
 * (runtime provider) is invoked through interfaces only — this module never
 * executes challenge code, spawns processes, or touches the host.
 */
export {
  createSandboxOrchestrator,
  DEFAULT_SANDBOX_DEADLINES,
  type SandboxOrchestrator,
  type SandboxOrchestratorDeps,
  type SandboxAuditContext,
  type SandboxDeadlines,
} from "./sandboxOrchestrator.ts"

export {
  resolveSandboxPolicy,
  classifyDestination,
  DEFAULT_SANDBOX_POLICY,
  SANDBOX_MAX_LIMITS,
} from "./sandboxPolicy.ts"

export {
  SandboxError,
  policyRejected,
  runtimeUnavailable,
  provisionFailed,
  sandboxTimeout,
  limitExceeded,
  sandboxNotFound,
  invalidState,
  idempotencyConflict,
  type SandboxErrorCode,
} from "./sandboxErrors.ts"

export type {
  SandboxPolicy,
  SandboxResourcePolicy,
  SandboxNetworkPolicy,
  SandboxCapabilityPolicy,
  SandboxFilesystemPolicy,
  SandboxProvisionRequest,
  SandboxDescriptorDTO,
  PolicyResolution,
  PolicyRejectionReason,
  SandboxAuditEvent,
  NetworkIngressMode,
  NetworkEgressMode,
} from "./sandboxTypes.ts"
