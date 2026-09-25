/**
 * LIVE PostgreSQL integration tests (Phase 18).
 *
 * Run ONLY when DATABASE_URL is set (CI provisions a PostgreSQL service and runs
 * `prisma migrate deploy` before the suite); they skip on hosts without a
 * reachable database (e.g. Termux/aarch64, where the Prisma engine cannot run).
 *
 * Coverage:
 *   - the migrated schema exists (tables, indexes, constraints, enum, and the
 *     _prisma_migrations ledger) — validates `migrate deploy` on a clean DB;
 *   - DATABASE_URL selects the real Prisma/PostgreSQL repository path — a write
 *     through the app is observable as a row in Postgres;
 *   - the app boots against the migrated schema and the auth flow persists;
 *   - /ready reports the real database + shared-state probes, and no response
 *     leaks a connection string or secret.
 *
 * Separation: in-memory auth-flow coverage lives in tests/authFlow.test.ts; this
 * file only exercises the live database.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import type { PrismaClient } from "@prisma/client"
import { getPrismaClient, disconnectPrisma } from "../../src/db/prisma.ts"
import {
  connectRespClient,
  type RespTestClient,
} from "./support/respClient.ts"
import {
  buildIntegrationApp,
  hasPostgres,
  hasLiveInfra,
  DATABASE_URL,
  REDIS_URL,
  uniqueSuffix,
} from "./support/harness.ts"

const ORIGIN = "http://localhost:5173"
const PASSWORD = "correct horse battery staple"

const EXPECTED_TABLES = [
  "users",
  "roles",
  "user_roles",
  "sessions",
  "challenge_progress",
  "score_events",
  "learning_progress",
  "mission_progress",
  "audit_logs",
  "environments",
]

describe.skipIf(!hasPostgres)("live PostgreSQL — migrated schema", () => {
  let prisma: PrismaClient
  beforeAll(() => {
    prisma = getPrismaClient(DATABASE_URL!)
  })
  afterAll(async () => {
    await disconnectPrisma()
  })

  it("answers a trivial round-trip (SELECT 1)", async () => {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`
    expect(Number(rows[0]!.ok)).toBe(1)
  })

  it("has every expected table from the migrations", async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'`
    const names = new Set(rows.map((r) => r.table_name))
    for (const table of EXPECTED_TABLES) {
      expect(names.has(table), `missing table ${table}`).toBe(true)
    }
  })

  it("records all migrations as applied (migrate deploy succeeded)", async () => {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
    expect(Number(rows[0]!.n)).toBeGreaterThanOrEqual(5)
  })

  it("has the required unique constraints/indexes", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
    const idx = new Set(rows.map((r) => r.indexname))
    expect(idx.has("users_email_key")).toBe(true)
    expect(idx.has("sessions_tokenHash_key")).toBe(true)
    // The once-only scoring guarantee is a unique triple on score_events.
    expect(idx.has("score_events_userId_challengeSlug_reason_key")).toBe(true)
  })

  it("has the AuditEvent enum with lifecycle + scoring values", async () => {
    const rows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditEvent'`
    const labels = new Set(rows.map((r) => r.enumlabel))
    for (const label of ["LOGIN_SUCCESS", "ENVIRONMENT_CREATED", "CHALLENGE_SCORE_AWARDED"]) {
      expect(labels.has(label), `missing enum ${label}`).toBe(true)
    }
  })
})

describe.skipIf(!hasLiveInfra)("live PostgreSQL — app over the real database", () => {
  let app: FastifyInstance
  let redis: RespTestClient
  let prisma: PrismaClient
  const email = `pg-${uniqueSuffix()}@example.com`

  beforeAll(async () => {
    redis = await connectRespClient(REDIS_URL!)
    app = await buildIntegrationApp(redis)
    prisma = getPrismaClient(DATABASE_URL!)
  })
  afterAll(async () => {
    if (app) await app.close()
    if (redis) await redis.close()
    await disconnectPrisma()
  })

  it("boots and reports /ready 200 with real DB + shared-state probes", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toEqual({
      status: "ready",
      checks: { database: "ok", sharedState: "ok" },
    })
  })

  it("register writes a row to Postgres (DATABASE_URL selects the Prisma path)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { origin: ORIGIN },
      payload: { email, password: PASSWORD, displayName: "PG User" },
    })
    expect(res.statusCode).toBe(201)
    // Observe the write directly in Postgres — proves it was NOT the in-memory
    // store (which would not survive a raw SQL read).
    const rows = await prisma.$queryRaw<Array<{ email: string }>>`
      SELECT email FROM users WHERE email = ${email}`
    expect(rows).toHaveLength(1)
  })

  it("session persists in the database (login → /auth/me → logout)", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: ORIGIN },
      payload: { email, password: PASSWORD },
    })
    expect(login.statusCode).toBe(200)
    const cookie = login.cookies.find((c) => c.name === "cyv_session")!.value

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { cyv_session: cookie },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().data.email).toBe(email)

    // The session row is real: exactly one live session for this user in PG.
    const sessions = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM sessions s
      JOIN users u ON u.id = s."userId"
      WHERE u.email = ${email} AND s."revokedAt" IS NULL`
    expect(Number(sessions[0]!.n)).toBe(1)

    const out = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { origin: ORIGIN },
      cookies: { cyv_session: cookie },
    })
    expect(out.statusCode).toBe(200)

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { cyv_session: cookie },
    })
    expect(after.statusCode).toBe(401)
  })

  it("never leaks a connection string or secret in /ready or /health", async () => {
    for (const url of ["/ready", "/health"]) {
      const res = await app.inject({ method: "GET", url })
      expect(res.payload).not.toMatch(/postgres|redis:\/\/|password|passwordHash/i)
    }
  })
})
