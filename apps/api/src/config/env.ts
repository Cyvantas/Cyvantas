/**
 * Environment configuration for the CYVANTAS Lab API.
 *
 * Safe-by-default: binds to loopback, refuses wildcard CORS, and holds no
 * secrets. Values come from process.env with conservative fallbacks so the
 * service runs locally with zero setup.
 *
 * Phase 8 adds auth/database configuration. When DATABASE_URL is absent the
 * API runs against an in-memory data store (development/test convenience);
 * when present it uses PostgreSQL via Prisma. See docs/AUTH.md.
 */
import type { SecurityDetectionConfig } from "../monitoring/securityMonitor.ts"

const DEFAULT_PORT = 8787
const DEFAULT_HOST = "127.0.0.1"
const DEFAULT_CORS_ORIGIN = "http://localhost:5173"
const DEFAULT_SESSION_COOKIE_NAME = "cyv_session"
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Environment-service policy defaults. Centralized so limits/TTL are never
// hard-coded across the codebase; every value is server-authoritative.
const DEFAULT_MAX_ACTIVE_ENVIRONMENTS = 3
const DEFAULT_MAX_TOTAL_ENVIRONMENTS = 25
const DEFAULT_ENVIRONMENT_TTL_MINUTES = 60
const DEFAULT_MAX_ENVIRONMENT_LIFETIME_MINUTES = 240

// Detection thresholds (Phase 13). These drive OBSERVE-ONLY escalation events;
// they never deny a request (the rate limiter does that). Windows are fixed
// constants; the occurrence thresholds are env-overridable so an operator can
// tune sensitivity without a code change. Defaults sit above the per-user rate
// limits so a single well-behaved user never trips a detection alert.
const DEFAULT_DETECTION = {
  failedAuth: { threshold: 8, windowMs: 15 * 60 * 1000 },
  challengeSubmission: { threshold: 40, windowMs: 60 * 1000 },
  environmentActivity: { threshold: 40, windowMs: 60 * 1000 },
  invalidSession: { threshold: 12, windowMs: 5 * 60 * 1000 },
  requestBurst: { threshold: 600, windowMs: 60 * 1000 },
} as const

export type NodeEnv = "development" | "test" | "production"

/**
 * Environment-service policy. TTL is the sliding idle window; maxLifetimeMinutes
 * is the absolute cap from creation that a client can NEVER extend past.
 */
export interface EnvironmentPolicy {
  readonly maxActive: number
  readonly maxTotal: number
  readonly ttlMinutes: number
  readonly maxLifetimeMinutes: number
}

/**
 * Monitoring / abuse-detection configuration (Phase 13). `logSecurityEvents`
 * gates the console sink; `detection` holds the fixed-window thresholds used by
 * the security monitor's detection layer.
 */
export interface SecurityConfig {
  readonly logSecurityEvents: boolean
  readonly detection: SecurityDetectionConfig
}

export interface AppConfig {
  readonly port: number
  readonly host: string
  /** Explicit allow-list of origins. Never "*". */
  readonly corsOrigin: string[]
  readonly nodeEnv: NodeEnv
  /** Postgres connection string. Undefined → in-memory store (dev/test). */
  readonly databaseUrl: string | undefined
  /**
   * Redis-compatible connection string for shared state (rate limiter /
   * detection) in a multi-instance deployment. Optional and provider-neutral:
   * the repository ships no Redis client and selects no provider. When set, the
   * deployment boundary (src/server.ts → resolveSharedStateStore) builds a
   * Redis-backed store from an injected client; if no client factory is wired,
   * boot is refused fail-closed rather than silently using per-process state.
   * Absent → in-memory store (single-instance only). See src/infra/sharedState.ts,
   * src/infra/sharedStateFactory.ts, and docs/PRODUCTION-INFRASTRUCTURE.md.
   * Never logged.
   */
  readonly redisUrl: string | undefined
  readonly sessionCookieName: string
  readonly sessionTtlSeconds: number
  /** True when the API should emit Secure cookies (production over HTTPS). */
  readonly cookieSecure: boolean
  readonly environment: EnvironmentPolicy
  readonly security: SecurityConfig
}

function parsePort(raw: string | undefined): number {
  if (!raw) return DEFAULT_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`)
  }
  return port
}

function parseCorsOrigin(raw: string | undefined, nodeEnv: NodeEnv): string[] {
  const value = raw?.trim()
  if (!value) {
    // Fail-closed in production: an explicit allow-list is mandatory. A silent
    // localhost fallback would either break the deployment or, worse, quietly
    // accept dev origins on a production host.
    if (nodeEnv === "production") {
      throw new Error("CORS_ORIGIN is required in production. Set explicit https origins.")
    }
    return [DEFAULT_CORS_ORIGIN]
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (origins.includes("*")) {
    throw new Error("Wildcard CORS ('*') is not permitted. Set explicit origins.")
  }
  if (origins.length === 0) {
    if (nodeEnv === "production") {
      throw new Error("CORS_ORIGIN is required in production. Set explicit https origins.")
    }
    return [DEFAULT_CORS_ORIGIN]
  }
  // In production every origin must be an absolute https:// URL. Reject
  // http/loopback so a mistaken value can never downgrade the browser trust
  // boundary or expose the credentialed cookie over cleartext.
  if (nodeEnv === "production") {
    for (const origin of origins) {
      let url: URL
      try {
        url = new URL(origin)
      } catch {
        throw new Error(`Invalid CORS_ORIGIN entry (must be an absolute URL): ${origin}`)
      }
      if (url.protocol !== "https:") {
        throw new Error(`CORS_ORIGIN must use https in production: ${origin}`)
      }
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
        throw new Error(`CORS_ORIGIN must not be a loopback host in production: ${origin}`)
      }
    }
  }
  return origins
}

function parseNodeEnv(raw: string | undefined): NodeEnv {
  const value = raw?.trim()
  if (value === "production" || value === "test") return value
  return "development"
}

/**
 * Optional Redis connection string. When present it must be a valid
 * redis:// or rediss:// URL. Its value is never logged. Absent → in-memory
 * shared state (single-instance only).
 */
function parseRedisUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("Invalid REDIS_URL (must be a redis:// or rediss:// URL)")
  }
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use the redis:// or rediss:// scheme")
  }
  return value
}

function parseSessionTtl(raw: string | undefined): number {
  if (!raw) return DEFAULT_SESSION_TTL_SECONDS
  const ttl = Number(raw)
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 60 * 60 * 24 * 90) {
    throw new Error(`Invalid SESSION_TTL (seconds, 60..7776000): ${raw}`)
  }
  return ttl
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  label: string,
  { min = 1, max = 100_000 }: { min?: number; max?: number } = {},
): number {
  if (raw === undefined || raw.trim() === "") return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${label} (${min}..${max}): ${raw}`)
  }
  return value
}

function parseEnvironmentPolicy(env: NodeJS.ProcessEnv): EnvironmentPolicy {
  const maxActive = parsePositiveInt(
    env.MAX_ACTIVE_ENVIRONMENTS,
    DEFAULT_MAX_ACTIVE_ENVIRONMENTS,
    "MAX_ACTIVE_ENVIRONMENTS",
    { max: 1000 },
  )
  const maxTotal = parsePositiveInt(
    env.MAX_TOTAL_ENVIRONMENTS,
    DEFAULT_MAX_TOTAL_ENVIRONMENTS,
    "MAX_TOTAL_ENVIRONMENTS",
    { max: 10_000 },
  )
  const ttlMinutes = parsePositiveInt(
    env.ENVIRONMENT_TTL_MINUTES,
    DEFAULT_ENVIRONMENT_TTL_MINUTES,
    "ENVIRONMENT_TTL_MINUTES",
    { max: 60 * 24 },
  )
  const maxLifetimeMinutes = parsePositiveInt(
    env.MAX_ENVIRONMENT_LIFETIME_MINUTES,
    DEFAULT_MAX_ENVIRONMENT_LIFETIME_MINUTES,
    "MAX_ENVIRONMENT_LIFETIME_MINUTES",
    { max: 60 * 24 * 7 },
  )
  if (maxLifetimeMinutes < ttlMinutes) {
    throw new Error(
      "MAX_ENVIRONMENT_LIFETIME_MINUTES must be >= ENVIRONMENT_TTL_MINUTES",
    )
  }
  if (maxTotal < maxActive) {
    throw new Error(
      "MAX_TOTAL_ENVIRONMENTS must be >= MAX_ACTIVE_ENVIRONMENTS",
    )
  }
  return { maxActive, maxTotal, ttlMinutes, maxLifetimeMinutes }
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  const value = raw?.trim().toLowerCase()
  if (value === undefined || value === "") return fallback
  if (value === "true" || value === "1" || value === "yes") return true
  if (value === "false" || value === "0" || value === "no") return false
  throw new Error(`Invalid boolean flag: ${raw}`)
}

function parseSecurityConfig(
  env: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): SecurityConfig {
  const d = DEFAULT_DETECTION
  return {
    // Quiet by default under test so the suite does not print event lines.
    logSecurityEvents: parseBoolean(env.SECURITY_EVENT_LOG, nodeEnv !== "test"),
    detection: {
      failedAuth: {
        threshold: parsePositiveInt(
          env.SECURITY_FAILED_AUTH_THRESHOLD,
          d.failedAuth.threshold,
          "SECURITY_FAILED_AUTH_THRESHOLD",
          { max: 100_000 },
        ),
        windowMs: d.failedAuth.windowMs,
      },
      challengeSubmission: {
        threshold: parsePositiveInt(
          env.SECURITY_SUBMISSION_THRESHOLD,
          d.challengeSubmission.threshold,
          "SECURITY_SUBMISSION_THRESHOLD",
          { max: 100_000 },
        ),
        windowMs: d.challengeSubmission.windowMs,
      },
      environmentActivity: {
        threshold: parsePositiveInt(
          env.SECURITY_ENV_ACTIVITY_THRESHOLD,
          d.environmentActivity.threshold,
          "SECURITY_ENV_ACTIVITY_THRESHOLD",
          { max: 100_000 },
        ),
        windowMs: d.environmentActivity.windowMs,
      },
      invalidSession: {
        threshold: parsePositiveInt(
          env.SECURITY_INVALID_SESSION_THRESHOLD,
          d.invalidSession.threshold,
          "SECURITY_INVALID_SESSION_THRESHOLD",
          { max: 100_000 },
        ),
        windowMs: d.invalidSession.windowMs,
      },
      requestBurst: {
        threshold: parsePositiveInt(
          env.SECURITY_REQUEST_BURST_THRESHOLD,
          d.requestBurst.threshold,
          "SECURITY_REQUEST_BURST_THRESHOLD",
          { max: 1_000_000 },
        ),
        windowMs: d.requestBurst.windowMs,
      },
    },
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV)
  const databaseUrl = env.DATABASE_URL?.trim() || undefined

  if (nodeEnv === "production" && !databaseUrl) {
    throw new Error("DATABASE_URL is required in production")
  }

  return {
    port: parsePort(env.PORT),
    host: env.HOST?.trim() || DEFAULT_HOST,
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN, nodeEnv),
    nodeEnv,
    databaseUrl,
    redisUrl: parseRedisUrl(env.REDIS_URL),
    sessionCookieName:
      env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME,
    sessionTtlSeconds: parseSessionTtl(env.SESSION_TTL),
    cookieSecure: nodeEnv === "production",
    environment: parseEnvironmentPolicy(env),
    security: parseSecurityConfig(env, nodeEnv),
  }
}

export const SERVICE_NAME = "cyvantas-api"
export const SERVICE_VERSION = "0.1.0"
