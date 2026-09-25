/**
 * Security-event sinks (Phase 13).
 *
 * A sink is the output boundary for structured security events. The monitor
 * emits fully-formed, already-redacted events; a sink only serializes/forwards
 * them. Sinks are synchronous and MUST NOT throw — a failing sink can never be
 * allowed to break a request (observability is best-effort, security decisions
 * are not made here).
 *
 * Implementations:
 *   - createConsoleSink: one redaction-safe JSON line per event on a writer
 *     (defaults to process.stdout). Suitable for local dev and for shipping to
 *     a log collector in production.
 *   - createMemorySink: captures events in an array for assertions in tests.
 *   - createNoopSink: discards events (used in the test harness by default so
 *     the suite stays quiet).
 */
import type { SecurityEvent } from "./events.ts"

export interface SecurityEventSink {
  emit(event: SecurityEvent): void
}

export interface MemorySink extends SecurityEventSink {
  readonly events: readonly SecurityEvent[]
  clear(): void
}

export function createNoopSink(): SecurityEventSink {
  return { emit() {} }
}

export function createMemorySink(): MemorySink {
  const events: SecurityEvent[] = []
  return {
    emit(event) {
      events.push(event)
    },
    get events() {
      return events
    },
    clear() {
      events.length = 0
    },
  }
}

export function createConsoleSink(
  write: (line: string) => void = (line) => process.stdout.write(line),
): SecurityEventSink {
  return {
    emit(event) {
      try {
        write(`${JSON.stringify({ kind: "security_event", ...event })}\n`)
      } catch {
        // A serialization/write failure must never surface to the caller.
      }
    },
  }
}
