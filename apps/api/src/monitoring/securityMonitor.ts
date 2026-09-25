/**
 * Security monitor (Phase 13) — the single funnel through which security and
 * application events reach a sink, and the home of threshold-based detection.
 *
 * Responsibilities:
 *   - Normalize + redact every event before it is emitted (secrets, oversized
 *     strings, and deep structures never reach a sink).
 *   - Translate persisted audit events into structured security events, so a
 *     single seam (wrapping the AuditRepository) instruments every existing
 *     audit call site without changing any service.
 *   - Run fixed-window detection over those events plus request-level signals,
 *     emitting a single "…_ABUSE_SUSPECTED" event when a threshold is crossed.
 *
 * The monitor makes NO authorization decisions and performs NO I/O beyond the
 * injected sink. It never throws to its callers — observability must not be
 * able to break a request.
 */
import type { AuditRecordInput } from "../repositories/types.ts"
import {
  auditEventMeta,
  type SecurityEvent,
  type SecurityEventCategory,
  type SecurityEventName,
  type SecurityOutcome,
  type SecuritySeverity,
} from "./events.ts"
import { redactDetail, sanitizeIp, sanitizeUserAgent } from "./redaction.ts"
import type { DetectionRule, DetectionTracker } from "./detection.ts"
import type { SecurityEventSink } from "./sink.ts"

/** Configurable detection thresholds (server-authoritative; env-overridable). */
export interface SecurityDetectionConfig {
  failedAuth: DetectionRule
  challengeSubmission: DetectionRule
  environmentActivity: DetectionRule
  invalidSession: DetectionRule
  requestBurst: DetectionRule
}

export interface SecurityMonitorDeps {
  sink: SecurityEventSink
  detection: DetectionTracker
  config: SecurityDetectionConfig
  now?: () => Date
}

/** Request-scoped context shared by the request-level monitor entry points. */
export interface RequestContext {
  ip?: string | null
  userAgent?: string | null
  requestId?: string | null
  actorId?: string | null
}

export interface EmitInput {
  name: SecurityEventName
  category: SecurityEventCategory
  severity: SecuritySeverity
  outcome?: SecurityOutcome
  ctx?: RequestContext
  detail?: Record<string, unknown>
}

export interface SecurityMonitor {
  /** Emit an arbitrary (already-classified) event. Redacted before it leaves. */
  emit(input: EmitInput): void
  /** Instrument a persisted audit event + feed detection. */
  fromAudit(input: AuditRecordInput): void
  /** A request was denied by the abuse guard. */
  rateLimited(signal: string, ctx: RequestContext, detail?: Record<string, unknown>): void
  /** A session cookie was presented but did not resolve to a valid session. */
  invalidSession(ctx: RequestContext): void
  /** Observe a request for burst detection (no per-request emit unless tripped). */
  requestObserved(ctx: RequestContext): void
}

const UNKNOWN = "unknown"

export function createSecurityMonitor(deps: SecurityMonitorDeps): SecurityMonitor {
  const { sink, detection, config } = deps
  const now = deps.now ?? (() => new Date())

  function emit(input: EmitInput): void {
    const ctx = input.ctx ?? {}
    const event: SecurityEvent = {
      name: input.name,
      category: input.category,
      severity: input.severity,
      timestamp: now().toISOString(),
      requestId: ctx.requestId ?? null,
      actorId: ctx.actorId ?? null,
      ip: sanitizeIp(ctx.ip),
      userAgent: sanitizeUserAgent(ctx.userAgent),
      outcome: input.outcome,
      detail: redactDetail(input.detail),
    }
    sink.emit(event)
  }

  function escalate(
    name: SecurityEventName,
    ctx: RequestContext,
    detail: Record<string, unknown>,
  ): void {
    emit({ name, category: "ABUSE", severity: "ALERT", outcome: "detected", ctx, detail })
  }

  return {
    emit,

    fromAudit(input: AuditRecordInput): void {
      const meta = auditEventMeta(input.event)
      const ctx: RequestContext = {
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        actorId: input.userId ?? null,
      }
      emit({
        name: input.event,
        category: meta.category,
        severity: meta.severity,
        outcome: meta.outcome,
        ctx,
      })

      // Detection: escalate on threshold crossings derived from audit signals.
      if (input.event === "LOGIN_FAILURE") {
        const ip = sanitizeIp(input.ip) ?? UNKNOWN
        const byIp = detection.record(`failed-auth:ip:${ip}`, config.failedAuth)
        if (byIp.tripped) {
          escalate("AUTH_ABUSE_SUSPECTED", ctx, {
            scope: "ip",
            count: byIp.count,
            threshold: config.failedAuth.threshold,
          })
        }
        if (input.userId) {
          const byUser = detection.record(`failed-auth:user:${input.userId}`, config.failedAuth)
          if (byUser.tripped) {
            escalate("AUTH_ABUSE_SUSPECTED", ctx, {
              scope: "user",
              count: byUser.count,
              threshold: config.failedAuth.threshold,
            })
          }
        }
      } else if (
        input.event === "CHALLENGE_SUBMISSION_ACCEPTED" ||
        input.event === "CHALLENGE_SUBMISSION_REJECTED"
      ) {
        if (input.userId) {
          const r = detection.record(`submission:user:${input.userId}`, config.challengeSubmission)
          if (r.tripped) {
            escalate("CHALLENGE_SUBMISSION_ABUSE_SUSPECTED", ctx, {
              scope: "user",
              count: r.count,
              threshold: config.challengeSubmission.threshold,
            })
          }
        }
      } else if (
        input.event === "ENVIRONMENT_CREATED" ||
        input.event === "CHALLENGE_ENVIRONMENT_REQUESTED" ||
        input.event === "ENVIRONMENT_RESET_REQUESTED" ||
        input.event === "CHALLENGE_ENVIRONMENT_RESET"
      ) {
        if (input.userId) {
          const r = detection.record(`env-activity:user:${input.userId}`, config.environmentActivity)
          if (r.tripped) {
            escalate("ENVIRONMENT_ABUSE_SUSPECTED", ctx, {
              scope: "user",
              count: r.count,
              threshold: config.environmentActivity.threshold,
            })
          }
        }
      }
    },

    rateLimited(signal, ctx, detail): void {
      emit({
        name: "RATE_LIMIT_EXCEEDED",
        category: "RATE_LIMIT",
        severity: "WARNING",
        outcome: "denied",
        ctx,
        detail: { signal, ...detail },
      })
    },

    invalidSession(ctx): void {
      emit({
        name: "INVALID_SESSION_PRESENTED",
        category: "SESSION",
        severity: "NOTICE",
        outcome: "failure",
        ctx,
      })
      const ip = sanitizeIp(ctx.ip) ?? UNKNOWN
      const r = detection.record(`invalid-session:ip:${ip}`, config.invalidSession)
      if (r.tripped) {
        escalate("INVALID_SESSION_ABUSE_SUSPECTED", ctx, {
          scope: "ip",
          count: r.count,
          threshold: config.invalidSession.threshold,
        })
      }
    },

    requestObserved(ctx): void {
      const ip = sanitizeIp(ctx.ip) ?? UNKNOWN
      const r = detection.record(`request-burst:ip:${ip}`, config.requestBurst)
      if (r.tripped) {
        escalate("REQUEST_BURST_SUSPECTED", ctx, {
          scope: "ip",
          count: r.count,
          threshold: config.requestBurst.threshold,
        })
      }
    },
  }
}
