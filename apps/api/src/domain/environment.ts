/**
 * Environment domain types.
 *
 * Defined as const unions (not TS enums) to satisfy `erasableSyntaxOnly`. These
 * mirror the Prisma enums but keep the service/repository layer decoupled from
 * the generated Prisma client (the in-memory store never imports Prisma).
 *
 * IMPORTANT: `status` (lifecycle / control-plane) is deliberately SEPARATE from
 * `runtimeStatus` (data-plane / future sandbox). Phase 9 persists lifecycle
 * only and never runs a runtime, so runtimeStatus stays NOT_PROVISIONED.
 */

export const ENVIRONMENT_TYPES = ["CHALLENGE", "MISSION"] as const
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number]

export const ENVIRONMENT_STATUSES = [
  "REQUESTED",
  "PROVISIONING",
  "READY",
  "ACTIVE",
  "TIMEOUT",
  "RESETTING",
  "DESTROYING",
  "DESTROYED",
  "FAILED",
] as const
export type EnvironmentStatus = (typeof ENVIRONMENT_STATUSES)[number]

export const ENVIRONMENT_RUNTIME_STATUSES = [
  "NOT_PROVISIONED",
  "STARTING",
  "RUNNING",
  "STOPPING",
  "STOPPED",
  "FAILED",
] as const
export type EnvironmentRuntimeStatus =
  (typeof ENVIRONMENT_RUNTIME_STATUSES)[number]

/** Statuses that hold a live slot and count toward MAX_ACTIVE_ENVIRONMENTS. */
export const LIVE_STATUSES: readonly EnvironmentStatus[] = [
  "REQUESTED",
  "PROVISIONING",
  "READY",
  "ACTIVE",
  "RESETTING",
]

/** Terminal statuses — no further transitions and not counted as retained. */
export const TERMINAL_STATUSES: readonly EnvironmentStatus[] = ["DESTROYED"]

export function isEnvironmentType(value: string): value is EnvironmentType {
  return (ENVIRONMENT_TYPES as readonly string[]).includes(value)
}

/**
 * Internal environment record as stored by the repositories. Includes fields
 * that are never exposed through the public DTO (userId, metadata, failure
 * internals beyond a code).
 */
export interface EnvironmentRecord {
  id: string
  userId: string
  type: EnvironmentType
  challengeSlug: string | null
  missionSlug: string | null
  status: EnvironmentStatus
  runtimeStatus: EnvironmentRuntimeStatus
  requestedAt: Date
  provisioningStartedAt: Date | null
  readyAt: Date | null
  startedAt: Date | null
  lastActivityAt: Date
  expiresAt: Date
  timeoutAt: Date | null
  destroyedAt: Date | null
  failureCode: string | null
  failureMessage: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Public, safe representation returned through the API. Deliberately omits
 * userId, metadata, failureMessage, and every runtime/provider internal. The
 * target slug is exposed since it is already public catalog data.
 */
export interface EnvironmentDTO {
  id: string
  type: EnvironmentType
  challengeSlug: string | null
  missionSlug: string | null
  status: EnvironmentStatus
  runtimeStatus: EnvironmentRuntimeStatus
  /** Honest runtime signal: no runtime provider is configured in Phase 9. */
  runtimeConfigured: boolean
  createdAt: string
  expiresAt: string
  lastActivityAt: string
  /** Set only when status is FAILED. A stable code, never a stack trace. */
  failureCode?: string
}

export function toEnvironmentDTO(
  record: EnvironmentRecord,
  runtimeConfigured: boolean,
): EnvironmentDTO {
  const dto: EnvironmentDTO = {
    id: record.id,
    type: record.type,
    challengeSlug: record.challengeSlug,
    missionSlug: record.missionSlug,
    status: record.status,
    runtimeStatus: record.runtimeStatus,
    runtimeConfigured,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    lastActivityAt: record.lastActivityAt.toISOString(),
  }
  if (record.status === "FAILED" && record.failureCode) {
    dto.failureCode = record.failureCode
  }
  return dto
}
