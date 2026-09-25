/**
 * Detection tracker (Phase 13) — fixed-window signal counters over a
 * SharedStateStore.
 *
 * Separate from the abuse rate limiter: the limiter DENIES requests, while the
 * detection tracker only OBSERVES. It counts occurrences of a signal for a
 * subject (e.g. failed logins for an ip, submissions for a user) within a
 * window and reports the exact moment a threshold is first crossed. The monitor
 * uses that transition to emit a single "…_ABUSE_SUSPECTED" event per window
 * rather than one per occurrence, so detection never floods the sink.
 *
 * Like the rate limiter, the tracker holds NO state itself — counters live in
 * the injected store. With the in-memory store this is single-process; with a
 * Redis-backed store the detection windows are shared across replicas, so a
 * distributed burst is still caught once. The store contract is INCR + EXPIRE,
 * keyed by `floor(now / windowMs) * windowMs`. No persistence beyond the store,
 * no direct network.
 */
import type { SharedStateStore } from "../infra/sharedState.ts"

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

export interface DetectionTracker {
  /** Record one occurrence of `key` and report the window count + trip edge. */
  record(key: string, rule: DetectionRule): Promise<DetectionOutcome>
}

const TTL_HEADROOM_SECONDS = 1

export function createSharedStateDetectionTracker(
  store: SharedStateStore,
  now: () => number = Date.now,
): DetectionTracker {
  return {
    async record(key, rule): Promise<DetectionOutcome> {
      const t = now()
      const windowStart = Math.floor(t / rule.windowMs) * rule.windowMs
      const bucket = `det:${key}:${windowStart}`
      const count = await store.increment(bucket, 1)
      if (count === 1) {
        await store.expire(
          bucket,
          Math.ceil(rule.windowMs / 1000) + TTL_HEADROOM_SECONDS,
        )
      }
      // `tripped` fires only on the transition occurrence so the monitor emits
      // one escalation per window, not one per subsequent occurrence.
      return { count, tripped: count === rule.threshold }
    },
  }
}
