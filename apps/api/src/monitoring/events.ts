/**
 * Security / application event taxonomy (Phase 13).
 *
 * A single, server-authoritative vocabulary for observable security events.
 * Two families feed the sink:
 *   1. Audit-derived events — one per persisted AuditEvent (see repositories/
 *      types.ts). These describe things that HAPPENED (a login, a submission).
 *   2. Detection / abuse events — emitted by the security monitor when a
 *      threshold is crossed or a request-level anomaly is seen. These describe
 *      things that are SUSPECTED (repeated failures, bursts, invalid sessions).
 *
 * Every event carries a category + severity so downstream tooling can route
 * and alert without parsing free text. Detail payloads are always redacted
 * before emission (see redaction.ts) — an event never carries a password,
 * session token, challenge flag, authorization header, or other secret.
 */
import type { AuditEventName } from "../repositories/types.ts"

export type SecuritySeverity = "INFO" | "NOTICE" | "WARNING" | "ALERT"

export type SecurityEventCategory =
  | "AUTH"
  | "SESSION"
  | "ENVIRONMENT"
  | "SANDBOX"
  | "CHALLENGE"
  | "SCORING"
  | "RATE_LIMIT"
  | "ABUSE"
  | "REQUEST"

/** Outcome classifier — deliberately coarse, never a free-text reason. */
export type SecurityOutcome = "success" | "failure" | "denied" | "detected"

/**
 * Detection / abuse event names. These are NOT audit events — they are emitted
 * by the monitor's detection layer and the abuse guard, in addition to the
 * audit-derived events.
 */
export type DetectionEventName =
  | "RATE_LIMIT_EXCEEDED"
  | "AUTH_ABUSE_SUSPECTED"
  | "CHALLENGE_SUBMISSION_ABUSE_SUSPECTED"
  | "ENVIRONMENT_ABUSE_SUSPECTED"
  | "INVALID_SESSION_PRESENTED"
  | "INVALID_SESSION_ABUSE_SUSPECTED"
  | "REQUEST_BURST_SUSPECTED"

export type SecurityEventName = AuditEventName | DetectionEventName

/**
 * A structured, redaction-safe security event. `detail` is scrubbed before it
 * reaches a sink; callers should still avoid placing sensitive values in it.
 */
export interface SecurityEvent {
  name: SecurityEventName
  category: SecurityEventCategory
  severity: SecuritySeverity
  /** ISO-8601 timestamp assigned at record time. */
  timestamp: string
  /** Correlation id for the originating request, when available. */
  requestId?: string | null
  /** Server-derived actor (user) id. NEVER taken from client input. */
  actorId?: string | null
  ip?: string | null
  userAgent?: string | null
  outcome?: SecurityOutcome
  detail?: Record<string, unknown>
}

interface AuditEventMeta {
  category: SecurityEventCategory
  severity: SecuritySeverity
  outcome?: SecurityOutcome
}

/**
 * Category + severity for each persisted audit event. Failures and
 * privilege/limit-relevant events are raised above INFO so alerting can key on
 * severity alone. Anything not listed falls back to a safe INFO default.
 */
const AUDIT_EVENT_META: Record<AuditEventName, AuditEventMeta> = {
  LOGIN_SUCCESS: { category: "AUTH", severity: "INFO", outcome: "success" },
  LOGIN_FAILURE: { category: "AUTH", severity: "WARNING", outcome: "failure" },
  LOGOUT: { category: "SESSION", severity: "INFO", outcome: "success" },
  REGISTER: { category: "AUTH", severity: "NOTICE", outcome: "success" },
  SESSION_REVOKED: { category: "SESSION", severity: "NOTICE" },
  ROLE_CHANGED: { category: "AUTH", severity: "ALERT" },
  ENVIRONMENT_CREATED: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_START_REQUESTED: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_READY: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_ACTIVATED: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_RESET_REQUESTED: { category: "ENVIRONMENT", severity: "NOTICE" },
  ENVIRONMENT_STOP_REQUESTED: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_DESTROY_REQUESTED: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_DESTROYED: { category: "ENVIRONMENT", severity: "INFO" },
  ENVIRONMENT_TIMEOUT: { category: "ENVIRONMENT", severity: "NOTICE" },
  ENVIRONMENT_FAILED: { category: "ENVIRONMENT", severity: "WARNING", outcome: "failure" },
  SANDBOX_PROVISION_REQUESTED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_PROVISION_REJECTED: { category: "SANDBOX", severity: "WARNING", outcome: "denied" },
  SANDBOX_PROVISION_STARTED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_READY: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_START_REQUESTED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_STARTED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_STOP_REQUESTED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_STOPPED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_RESET_REQUESTED: { category: "SANDBOX", severity: "NOTICE" },
  SANDBOX_RESET: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_DESTROY_REQUESTED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_DESTROYED: { category: "SANDBOX", severity: "INFO" },
  SANDBOX_RUNTIME_UNAVAILABLE: { category: "SANDBOX", severity: "WARNING", outcome: "failure" },
  SANDBOX_POLICY_REJECTED: { category: "SANDBOX", severity: "WARNING", outcome: "denied" },
  SANDBOX_TIMEOUT: { category: "SANDBOX", severity: "WARNING", outcome: "failure" },
  CHALLENGE_ENVIRONMENT_REQUESTED: { category: "CHALLENGE", severity: "INFO" },
  CHALLENGE_ENVIRONMENT_READY: { category: "CHALLENGE", severity: "INFO" },
  CHALLENGE_ENVIRONMENT_FAILED: { category: "CHALLENGE", severity: "WARNING", outcome: "failure" },
  CHALLENGE_ENVIRONMENT_RESET: { category: "CHALLENGE", severity: "NOTICE" },
  CHALLENGE_ENVIRONMENT_DESTROYED: { category: "CHALLENGE", severity: "INFO" },
  CHALLENGE_SUBMISSION_ACCEPTED: { category: "CHALLENGE", severity: "NOTICE", outcome: "success" },
  CHALLENGE_SUBMISSION_REJECTED: { category: "CHALLENGE", severity: "NOTICE", outcome: "failure" },
  CHALLENGE_SCORE_AWARDED: { category: "SCORING", severity: "NOTICE", outcome: "success" },
}

const FALLBACK_META: AuditEventMeta = { category: "REQUEST", severity: "INFO" }

/** Metadata for a persisted audit event; safe fallback for any unmapped name. */
export function auditEventMeta(name: AuditEventName): AuditEventMeta {
  return AUDIT_EVENT_META[name] ?? FALLBACK_META
}
