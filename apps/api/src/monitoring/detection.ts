/**
 * Detection tracker (Phase 13) — fixed-window signal counters.
 *
 * Separate from the abuse rate limiter: the limiter DENIES requests, while the
 * detection tracker only OBSERVES. It counts occurrences of a signal for a
 * subject (e.g. failed logins for an ip, submissions for a user) within a
 * window and reports the exact moment a threshold is first crossed. The monitor
 * uses that transition to emit a single "…_ABUSE_SUSPECTED" event per window
 * rather than one per occurrence, so detection never floods the sink.
 *
 * In-memory / single-process by design (matching the rate limiter). A
 * multi-instance deployment would back this with a shared store; the interface
 * is intentionally narrow so that swap is local. No persistence, no network.
 */

export interface DetectionRule {
  /** Occurrences within the window before the signal is considered tripped. */
  threshold: number
  windowMs: number
}

export interface DetectionOutcome {
  /** Occurrences seen in the current window, including this one. */
  count: number
  /** True EXACTLY on the occurrence that reaches the threshold (once/window). */
  tripped: boolean
}

interface WindowState {
  count: number
  resetAt: number
}

export interface DetectionTracker {
  record(key: string, rule: DetectionRule): DetectionOutcome
  reset(key?: string): void
}

export function createDetectionTracker(
  now: () => number = Date.now,
): DetectionTracker {
  const windows = new Map<string, WindowState>()

  return {
    record(key, rule): DetectionOutcome {
      const t = now()
      const existing = windows.get(key)
      if (!existing || existing.resetAt <= t) {
        windows.set(key, { count: 1, resetAt: t + rule.windowMs })
        return { count: 1, tripped: rule.threshold <= 1 }
      }
      existing.count += 1
      // `tripped` fires only on the transition occurrence so the monitor emits
      // one escalation per window, not one per subsequent occurrence.
      return { count: existing.count, tripped: existing.count === rule.threshold }
    },
    reset(key): void {
      if (key === undefined) windows.clear()
      else windows.delete(key)
    },
  }
}
