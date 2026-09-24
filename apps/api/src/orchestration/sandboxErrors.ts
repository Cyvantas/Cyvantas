/**
 * Sandbox orchestration errors (Phase 10).
 *
 * All sandbox errors extend the app's `ApiError` so the central error handler
 * serializes them into the standard `{ error: { code, message, status } }`
 * envelope. EXTERNAL messages are deliberately generic and safe — they never
 * leak internal runtime/provider details, hostnames, paths, or stack traces.
 *
 * Machine-readable, NON-SENSITIVE policy rejection reasons are attached to
 * `SandboxError.reasons` for server-side logging and tests. They name a limit
 * ("CPU_LIMIT_EXCEEDED"), never a concrete value or internal detail, and are
 * NOT placed into the HTTP envelope.
 */
import { ApiError } from "../types/api.ts"
import type { PolicyRejectionReason } from "./sandboxTypes.ts"

export type SandboxErrorCode =
  | "SANDBOX_POLICY_REJECTED"
  | "SANDBOX_RUNTIME_UNAVAILABLE"
  | "SANDBOX_PROVISION_FAILED"
  | "SANDBOX_TIMEOUT"
  | "SANDBOX_LIMIT_EXCEEDED"
  | "SANDBOX_NOT_FOUND"
  | "SANDBOX_INVALID_STATE"
  | "SANDBOX_IDEMPOTENCY_CONFLICT"

/** Typed sandbox error. Extends ApiError; carries optional non-sensitive reasons. */
export class SandboxError extends ApiError {
  readonly reasons: readonly PolicyRejectionReason[]

  constructor(
    code: SandboxErrorCode,
    message: string,
    status: number,
    reasons: readonly PolicyRejectionReason[] = [],
  ) {
    super(code, message, status)
    this.name = "SandboxError"
    this.reasons = reasons
  }
}

export function policyRejected(
  reasons: readonly PolicyRejectionReason[],
): SandboxError {
  // Generic external message; the specific reasons stay server-side.
  return new SandboxError(
    "SANDBOX_POLICY_REJECTED",
    "The requested sandbox policy is not permitted.",
    422,
    reasons,
  )
}

export function runtimeUnavailable(): SandboxError {
  return new SandboxError(
    "SANDBOX_RUNTIME_UNAVAILABLE",
    "The sandbox runtime is not available.",
    503,
  )
}

export function provisionFailed(): SandboxError {
  return new SandboxError(
    "SANDBOX_PROVISION_FAILED",
    "The sandbox could not be provisioned.",
    502,
  )
}

export function sandboxTimeout(): SandboxError {
  return new SandboxError(
    "SANDBOX_TIMEOUT",
    "The sandbox operation timed out.",
    504,
  )
}

export function limitExceeded(): SandboxError {
  return new SandboxError(
    "SANDBOX_LIMIT_EXCEEDED",
    "A sandbox resource limit was exceeded.",
    409,
  )
}

export function sandboxNotFound(): SandboxError {
  return new SandboxError("SANDBOX_NOT_FOUND", "Sandbox not found.", 404)
}

export function invalidState(): SandboxError {
  return new SandboxError(
    "SANDBOX_INVALID_STATE",
    "The sandbox is not in a valid state for this operation.",
    409,
  )
}

export function idempotencyConflict(): SandboxError {
  return new SandboxError(
    "SANDBOX_IDEMPOTENCY_CONFLICT",
    "A conflicting sandbox operation is already in progress.",
    409,
  )
}
