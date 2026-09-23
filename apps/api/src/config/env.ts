/**
 * Environment configuration for the CYVANTAS Lab API.
 *
 * Safe-by-default: binds to loopback, refuses wildcard CORS, and holds no
 * secrets. Values come from process.env with conservative fallbacks so the
 * service runs locally with zero setup.
 */

const DEFAULT_PORT = 8787
const DEFAULT_HOST = "127.0.0.1"
const DEFAULT_CORS_ORIGIN = "http://localhost:5173"

export interface AppConfig {
  readonly port: number
  readonly host: string
  /** Explicit allow-list of origins. Never "*". */
  readonly corsOrigin: string[]
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parsePort(env.PORT),
    host: env.HOST?.trim() || DEFAULT_HOST,
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
  }
}

export const SERVICE_NAME = "cyvantas-api"
export const SERVICE_VERSION = "0.1.0"
