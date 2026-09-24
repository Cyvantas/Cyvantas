/**
 * Challenge security regression tests (Phase 11).
 *
 * Two guarantees:
 *  1. ARCHITECTURAL ABSENCE — the Phase 11 source (challenge contract, verifier,
 *     registry, service, and routes) can never execute a shell, spawn a process,
 *     invoke Docker, touch a Docker socket, or make arbitrary network calls. Its
 *     only runtime seam is the injected EnvironmentRuntimeProvider (via
 *     environmentService), which in this build is the not-configured provider.
 *  2. BEHAVIORAL — the real flag never appears in any response, and ownership is
 *     derived from the session, never from client-supplied input.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import { loadConfig } from "../src/config/env.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, "..", "src")
const challengesDir = join(srcDir, "challenges")

function phase11Sources(): Array<{ file: string; text: string }> {
  const files = readdirSync(challengesDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(challengesDir, f))
  files.push(join(srcDir, "services", "challengeService.ts"))
  files.push(join(srcDir, "routes", "challenges.ts"))
  return files.map((path) => ({ file: path, text: readFileSync(path, "utf8") }))
}

const FORBIDDEN_IMPORTS = [
  "child_process",
  "node:child_process",
  "dockerode",
  "node-docker-api",
  "@kubernetes/client-node",
  "net",
  "node:net",
  "dgram",
  "node:dgram",
  "tls",
  "node:tls",
  "fs",
  "node:fs",
]

const FORBIDDEN_CALLS = [
  /\bexec(?:Sync|File)?\s*\(/,
  /\bspawn(?:Sync)?\s*\(/,
  /\bfork\s*\(/,
  /\bfetch\s*\(/,
  /\brequire\s*\(\s*["']child_process["']\s*\)/,
  /docker\.sock/i,
  /\/var\/run\/docker/i,
]

describe("challenges — no execution primitives in Phase 11 source", () => {
  it("imports no process/container/socket/fs modules", () => {
    for (const { file, text } of phase11Sources()) {
      for (const mod of FORBIDDEN_IMPORTS) {
        const pattern = new RegExp(`from\\s+["']${mod.replace(/[/]/g, "\\/")}["']`)
        expect(pattern.test(text), `${file} must not import ${mod}`).toBe(false)
      }
    }
  })

  it("contains no shell/spawn/fetch/docker-socket call sites", () => {
    for (const { file, text } of phase11Sources()) {
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
      for (const pattern of FORBIDDEN_CALLS) {
        expect(pattern.test(code), `${file} must not contain ${pattern}`).toBe(false)
      }
    }
  })
})

describe("challenges — behavioral security proof", () => {
  const config = loadConfig({ NODE_ENV: "test", CORS_ORIGIN: "http://localhost:5173" })
  const COOKIE = config.sessionCookieName
  const ORIGIN = "http://localhost:5173"
  const SLUG = "reflected-xss"
  const CORRECT_FLAG = "CYVANTAS{reflected_xss_input_reflected_unencoded}"
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp({ config, repositories: createInMemoryRepositories() })
    await app.ready()
  })
  afterAll(async () => { await app.close() })

  async function token(email: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { origin: ORIGIN },
      payload: { email, password: "correct horse battery", displayName: "Sec User" },
    })
    return res.cookies.find((c) => c.name === COOKIE)!.value
  }

  it("never emits the flag through the environment or submission flow", async () => {
    const t = await token("sec1@example.com")
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      headers: { origin: ORIGIN },
      cookies: { [COOKIE]: t },
    })
    const id = created.json().data.environmentId
    const wrong = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      headers: { origin: ORIGIN },
      cookies: { [COOKIE]: t },
      payload: { environmentId: id, answer: "not-the-flag" },
    })
    expect(created.body).not.toContain(CORRECT_FLAG)
    expect(wrong.body).not.toContain(CORRECT_FLAG)
    expect(wrong.body).not.toContain("CYVANTAS{")
  })

  it("ignores a client-supplied userId in the body (actor from session only)", async () => {
    const owner = await token("sec-owner@example.com")
    const attacker = await token("sec-attacker@example.com")
    // Owner creates an environment.
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/environments`,
      headers: { origin: ORIGIN },
      cookies: { [COOKIE]: owner },
    })
    const ownerEnvId = created.json().data.environmentId
    // Attacker submits with a spoofed userId in the body pointing at the owner's
    // environment. Ownership is derived from the session, so this is a 404.
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/challenges/${SLUG}/submit`,
      headers: { origin: ORIGIN },
      cookies: { [COOKIE]: attacker },
      payload: { environmentId: ownerEnvId, answer: CORRECT_FLAG, userId: "spoofed" },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe("ENVIRONMENT_NOT_FOUND")
  })
})
