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

const DEFAULT_PORT = 8787
const DEFAULT_HOST = "127.0.0.1"
const DEFAULT_CORS_ORIGIN = "http://localhost:5173"
const DEFAULT_SESSION_COOKIE_NAME = "cyv_session"
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type NodeEnv = "development" | "test" | "production"

export interface AppConfig {
  readonly port: number
  readonly host: string
  /** Explicit allow-list of origins. Never "*". */
  readonly corsOrigin: string[]
  readonly nodeEnv: NodeEnv
  /** Postgres connection string. Undefined → in-memory store (dev/test). */
  readonly databaseUrl: string | undefined
  readonly sessionCookieName: string
  readonly sessionTtlSeconds: number
  /** True when the API should emit Secure cookies (production over HTTPS). */
  readonly cookieSecure: boolean
}

function parsePort(raw: string | undefined): number {
  if (!raw) return DEFAULT_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`)
  }
  return port
}

function parseCorsOrigin(raw: string | undefined): string[] {
  const value = raw?.trim()
  if (!value) return [DEFAULT_CORS_ORIGIN]
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (origins.includes("*")) {
    throw new Error("Wildcard CORS ('*') is not permitted. Set explicit origins.")
  }
  return origins.length > 0 ? origins : [DEFAULT_CORS_ORIGIN]
}

function parseNodeEnv(raw: string | undefined): NodeEnv {
  const value = raw?.trim()
  if (value === "production" || value === "test") return value
  return "development"
}

function parseSessionTtl(raw: string | undefined): number {
  if (!raw) return DEFAULT_SESSION_TTL_SECONDS
  const ttl = Number(raw)
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 60 * 60 * 24 * 90) {
    throw new Error(`Invalid SESSION_TTL (seconds, 60..7776000): ${raw}`)
  }
  return ttl
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
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
    nodeEnv,
    databaseUrl,
    sessionCookieName:
      env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME,
    sessionTtlSeconds: parseSessionTtl(env.SESSION_TTL),
    cookieSecure: nodeEnv === "production",
  }
}

export const SERVICE_NAME = "cyvantas-api"
export const SERVICE_VERSION = "0.1.0"
