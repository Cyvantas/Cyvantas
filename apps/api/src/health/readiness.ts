/**
 * Readiness aggregation.
 *
 * Distinct from liveness (`GET /health`): readiness answers "should this
 * instance receive production traffic?" by probing the dependencies required
 * for normal operation (database, shared state). It is:
 *
 *   - bounded: every probe is raced against a timeout so a hung dependency can
 *     never hang the request;
 *   - fail-closed: a probe that throws, rejects, or times out counts as
 *     UNAVAILABLE and makes the instance not-ready;
 *   - non-leaky: the report exposes only a coarse per-check status
 *     ("ok" | "unavailable"). Raw driver errors and connection strings are
 *     caught inside the probe and never surface.
 *
 * Probes are injected so tests never require a real database or Redis.
 */

/** A single named dependency probe. `check` should resolve true when healthy. */
export interface ReadinessProbe {
  readonly name: string
  check(): Promise<boolean>
}

export type ReadinessCheckStatus = "ok" | "unavailable"

export interface ReadinessReport {
  ready: boolean
  /** Coarse per-dependency status. Never contains error detail. */
  checks: Record<string, ReadinessCheckStatus>
}

export interface ReadinessService {
  check(): Promise<ReadinessReport>
}

const DEFAULT_TIMEOUT_MS = 2000

/** Race a probe against a timeout. Any rejection or timeout resolves false. */
async function runBounded(
  probe: ReadinessProbe,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  const result = Promise.resolve()
    .then(() => probe.check())
    .then((ok) => ok === true)
    .catch(() => false)
  try {
    return await Promise.race([result, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function createReadinessService(
  probes: readonly ReadinessProbe[],
  options: { timeoutMs?: number } = {},
): ReadinessService {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    async check(): Promise<ReadinessReport> {
      const results = await Promise.all(
        probes.map(async (probe) => {
          const ok = await runBounded(probe, timeoutMs)
          return [probe.name, ok] as const
        }),
      )
      const checks: Record<string, ReadinessCheckStatus> = {}
      let ready = true
      for (const [name, ok] of results) {
        checks[name] = ok ? "ok" : "unavailable"
        if (!ok) ready = false
      }
      return { ready, checks }
    },
  }
}
