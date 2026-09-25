/**
 * Monitoring security regression tests (Phase 13).
 *
 * Two guarantees for the monitoring + abuse-control source:
 *  1. ARCHITECTURAL ABSENCE — the monitoring/abuse code introduces no new
 *     execution, container, socket, filesystem, or network capability. It is
 *     pure in-process observability + counting; it must never grow a shell,
 *     spawn, docker socket, or outbound fetch.
 *  2. REDACTION COVERAGE — the sensitive-key pattern that scrubs event details
 *     matches every secret class we care about (passwords, tokens, session
 *     tokens, flags, authorization/cookie headers, api keys, hashes, answers),
 *     so a value under such a key can never reach a sink.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { SENSITIVE_KEY_PATTERN } from "../src/monitoring/redaction.ts"

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, "..", "src")
const monitoringDir = join(srcDir, "monitoring")

function phase13Sources(): Array<{ file: string; text: string }> {
  const files = readdirSync(monitoringDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(monitoringDir, f))
  files.push(join(srcDir, "security", "abuseGuard.ts"))
  files.push(join(srcDir, "security", "rateLimiter.ts"))
  // Phase 16: the shared-state seam + Redis adapter must remain pure. The
  // adapter delegates all I/O to an injected client and imports no Node
  // networking/socket module of its own.
  files.push(join(srcDir, "infra", "sharedState.ts"))
  files.push(join(srcDir, "infra", "redisSharedStateStore.ts"))
  return files.map((path) => ({ file: path, text: readFileSync(path, "utf8") }))
}

const FORBIDDEN_IMPORTS = [
  "child_process",
  "node:child_process",
  "dockerode",
  "@kubernetes/client-node",
  "net",
  "node:net",
  "dgram",
  "node:dgram",
  "tls",
  "node:tls",
  "fs",
  "node:fs",
  "http",
  "node:http",
  "https",
  "node:https",
]

const FORBIDDEN_CALLS = [
  /\bexec(?:Sync|File)?\s*\(/,
  /\bspawn(?:Sync)?\s*\(/,
  /\bfork\s*\(/,
  /\bfetch\s*\(/,
  /docker\.sock/i,
  /\/var\/run\/docker/i,
]

describe("monitoring — no execution/network primitives in Phase 13 source", () => {
  it("imports no process/container/socket/fs/http modules", () => {
    for (const { file, text } of phase13Sources()) {
      for (const mod of FORBIDDEN_IMPORTS) {
        const pattern = new RegExp(`from\\s+["']${mod.replace(/[/]/g, "\\/")}["']`)
        expect(pattern.test(text), `${file} must not import ${mod}`).toBe(false)
      }
    }
  })

  it("contains no shell/spawn/fetch/docker-socket call sites", () => {
    for (const { file, text } of phase13Sources()) {
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
      for (const pattern of FORBIDDEN_CALLS) {
        expect(pattern.test(code), `${file} must not contain ${pattern}`).toBe(false)
      }
    }
  })
})

describe("redaction — sensitive-key coverage", () => {
  const mustMatch = [
    "password",
    "passwd",
    "passwordHash",
    "token",
    "sessionToken",
    "session_token",
    "refreshToken",
    "secret",
    "clientSecret",
    "flag",
    "authorization",
    "authHeader",
    "cookie",
    "credential",
    "privateKey",
    "private_key",
    "apiKey",
    "api_key",
    "hash",
    "answer",
  ]

  it("matches every sensitive key class", () => {
    for (const key of mustMatch) {
      expect(SENSITIVE_KEY_PATTERN.test(key), `expected ${key} to be sensitive`).toBe(true)
    }
  })

  it("does not match ordinary observability keys", () => {
    for (const key of ["scope", "count", "threshold", "signal", "requestId", "ip", "userAgent", "outcome"]) {
      expect(SENSITIVE_KEY_PATTERN.test(key), `${key} should not be redacted`).toBe(false)
    }
  })
})
