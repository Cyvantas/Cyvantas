/**
 * Monitoring decorator for the AuditRepository (Phase 13).
 *
 * Wrapping the audit repository is the single, non-invasive seam that makes
 * every existing audit call site (authService, environmentService,
 * challengeService, sandbox orchestrator) emit a structured security event and
 * feed detection — without changing any service signature. The decorator
 * forwards to the real (persisting) repository first, then instruments the
 * event; instrumentation never throws, so it cannot break a write.
 */
import type { AuditRecordInput, AuditRepository } from "../repositories/types.ts"
import type { SecurityMonitor } from "./securityMonitor.ts"

export function createMonitoringAuditRepository(
  inner: AuditRepository,
  monitor: SecurityMonitor,
): AuditRepository {
  return {
    async record(input: AuditRecordInput): Promise<void> {
      await inner.record(input)
      // Best-effort observability: an emit failure must not fail the request.
      try {
        monitor.fromAudit(input)
      } catch {
        // swallow — monitoring is never allowed to break a security operation
      }
    },
  }
}
