/**
 * Environment lifecycle state machine.
 *
 * The ONLY place environment status transitions are authorized. Services must
 * route every status change through `assertTransition` (or `canTransition`) so
 * that illegal transitions are impossible — status is never mutated arbitrarily.
 *
 * Transitions (control-plane lifecycle):
 *
 *   REQUESTED    → PROVISIONING | TIMEOUT | DESTROYING | FAILED
 *   PROVISIONING → READY | TIMEOUT | DESTROYING | FAILED
 *   READY        → ACTIVE | RESETTING | TIMEOUT | DESTROYING | FAILED
 *   ACTIVE       → READY | TIMEOUT | RESETTING | DESTROYING | FAILED
 *   TIMEOUT      → RESETTING | DESTROYING | FAILED
 *   RESETTING    → READY | ACTIVE | TIMEOUT | DESTROYING | FAILED
 *   DESTROYING   → DESTROYED | FAILED
 *   FAILED       → DESTROYING | DESTROYED
 *   DESTROYED    → (terminal)
 *
 * Note: ACTIVE → READY models a `stop` (the runtime is stopped but the
 * environment record is retained and can be re-activated). This augments the
 * illustrative transition list in the Phase 9 brief so the `/stop` endpoint has
 * a coherent lifecycle target; it is documented in docs/ENVIRONMENTS.md.
 *
 * Note: every live status can reach TIMEOUT so the TTL sweeper can expire an
 * idle environment regardless of how far it progressed (e.g. a REQUESTED that
 * was never started, or a READY that was never activated).
 */
import type { EnvironmentStatus } from "./environment.ts"

const TRANSITIONS: Record<EnvironmentStatus, readonly EnvironmentStatus[]> = {
  REQUESTED: ["PROVISIONING", "TIMEOUT", "DESTROYING", "FAILED"],
  PROVISIONING: ["READY", "TIMEOUT", "DESTROYING", "FAILED"],
  READY: ["ACTIVE", "RESETTING", "TIMEOUT", "DESTROYING", "FAILED"],
  ACTIVE: ["READY", "TIMEOUT", "RESETTING", "DESTROYING", "FAILED"],
  TIMEOUT: ["RESETTING", "DESTROYING", "FAILED"],
  RESETTING: ["READY", "ACTIVE", "TIMEOUT", "DESTROYING", "FAILED"],
  DESTROYING: ["DESTROYED", "FAILED"],
  FAILED: ["DESTROYING", "DESTROYED"],
  DESTROYED: [],
}

/** Typed error thrown when an illegal status transition is attempted. */
export class InvalidEnvironmentTransitionError extends Error {
  readonly code = "INVALID_ENVIRONMENT_TRANSITION"
  readonly from: EnvironmentStatus
  readonly to: EnvironmentStatus

  constructor(from: EnvironmentStatus, to: EnvironmentStatus) {
    super(`Invalid environment transition: ${from} → ${to}`)
    this.name = "InvalidEnvironmentTransitionError"
    this.from = from
    this.to = to
  }
}

export function canTransition(
  from: EnvironmentStatus,
  to: EnvironmentStatus,
): boolean {
  return TRANSITIONS[from].includes(to)
}

export function assertTransition(
  from: EnvironmentStatus,
  to: EnvironmentStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidEnvironmentTransitionError(from, to)
  }
}

export function isTerminal(status: EnvironmentStatus): boolean {
  return TRANSITIONS[status].length === 0
}

export function allowedTransitions(
  from: EnvironmentStatus,
): readonly EnvironmentStatus[] {
  return TRANSITIONS[from]
}
