# CI — Live-Infrastructure Validation (Phase 18)

This document describes how CYVANTAS validates the API against **real**
PostgreSQL + Redis in continuous integration, **without selecting a hosting
provider**. It complements
[`PRODUCTION-INFRASTRUCTURE.md`](PRODUCTION-INFRASTRUCTURE.md) (the
provider-neutral deployment contract) and [`AUTH.md`](AUTH.md) (data model,
migration strategy).

> **No provider is chosen and nothing is deployed.** CI provisions *ephemeral*
> PostgreSQL and Redis **service containers** that live only for the duration of
> a job on a GitHub-hosted runner. They are thrown away when the job ends. This
> proves the real code paths — the Prisma/PostgreSQL repositories and the
> Redis-backed `SharedStateStore` — run against genuine backends, which the
> Termux/aarch64 build host cannot exercise locally.

## 1. Why this exists

The build host is Termux / Android / aarch64, where Prisma's native engines
cannot run and no PostgreSQL/Redis is installed (see
[`PRODUCTION-INFRASTRUCTURE.md`](PRODUCTION-INFRASTRUCTURE.md) §17). So locally we
can only run the in-memory path. The live suites below therefore **self-skip**
off-CI and **activate** in CI once the service URLs are present — giving us real
confidence that `migrate deploy`, the Prisma repositories, and the distributed
rate-limit / abuse-detection state all work against real infrastructure.

## 2. Workflow

`.github/workflows/api-integration.yml` — triggered on push / pull_request that
touch `apps/api/**` or the workflow file itself.

- **Runner:** `ubuntu-latest`. `working-directory: apps/api`.
- **Service containers** (job-local, loopback-only, health-gated):
  - `postgres:16` — user/pass/db `cyvantas` / `cyvantas` / `cyvantas_test`,
    port `5432`, `pg_isready` health check.
  - `redis:7` — port `6379`, `redis-cli ping` health check.
  The job's steps run only after both services report healthy.
- **Steps, in order:**
  1. `actions/checkout`
  2. `actions/setup-node` (Node 24, npm cache keyed on `apps/api/package-lock.json`)
  3. `npm ci` — install
  4. `npm run prisma:generate` — generate the Prisma client
  5. `npm run prisma:migrate:deploy` — apply migrations to the **clean** DB
  6. `npm run lint`
  7. `npm run build` — `tsc --noEmit` typecheck + `tsup` bundle
  8. `npm test` — **unit** suite (excludes `tests/integration/**`)
  9. `npm run test:integration` — **live** suite (real PostgreSQL + Redis)

Migration ordering is deliberate: step 5 applies the schema to a fresh database
**before** any step that reads or writes it (build/tests), so the app always runs
on the migrated schema — mirroring the production sequence
(`PRODUCTION-INFRASTRUCTURE.md` §6, §10).

## 3. Required CI environment

Set at the **job** level in the workflow (not repository secrets — these are
ephemeral, throwaway test values for a job-local container, never production
credentials):

| Variable       | CI value                                                                 | Purpose |
| -------------- | ------------------------------------------------------------------------- | ------- |
| `NODE_ENV`     | `test`                                                                    | Cookies non-Secure + localhost CORS default (the job terminates no TLS), while the DB/Redis URLs still select the real backends. Isolates "does the live path work" from the production-mode fail-close checks (`tests/productionHardening.test.ts`). |
| `CORS_ORIGIN`  | `http://localhost:5173`                                                   | Matches the test-mode default; the integration app injects this origin. |
| `DATABASE_URL` | `postgresql://cyvantas:cyvantas@localhost:5432/cyvantas_test?schema=public` | Selects the real Prisma/PostgreSQL repository path. |
| `REDIS_URL`    | `redis://localhost:6379`                                                  | Selects the Redis-backed `SharedStateStore` via the Phase 17 factory. |

These values are **never echoed** by any step. Production wires its own hardened
`DATABASE_URL` / `REDIS_URL` (TLS, real credentials) through the platform secret
manager at the deployment boundary — see §5.

## 4. What the live suites prove

All live tests are gated with `describe.skipIf` and live under
`tests/integration/` (a tiny provider-neutral RESP client in
`tests/integration/support/respClient.ts` speaks to Redis over `node:net` — kept
in `tests/` so the src forbidden-import scan in
`tests/monitoringSecurity.test.ts` stays green; the app ships **no** Redis
client).

- **`redis.live.test.ts`** — the `SharedStateStore` adapter over a **real**
  broker: `ping`, `SET`/`GET`, null-on-miss, atomic `increment`, `delete`, TTL
  expiry, `expire()`, and 200 concurrent increments settling to exactly 200.
- **`postgres.live.test.ts`** — (a) the migrated schema exists on a clean DB:
  every expected table, the required unique indexes/constraints, the
  `AuditEvent` enum, and `_prisma_migrations` recording the applied migrations
  (proves `migrate deploy` succeeded); (b) the app over the real DB: `/ready`
  reports `{ database: "ok", sharedState: "ok" }`, `register` writes a row
  observable via raw SQL (proving the Prisma path, not in-memory), a full
  login → `/auth/me` → session-row → logout → 401 cycle, and no
  connection-string/secret leakage in `/ready` or `/health`.
- **`distributed.live.test.ts`** — the property that makes the shared-state seam
  worth having: with a real Redis behind it, **two independent logical instances
  enforce ONE global** rate limit / abuse-detection state (counter shared across
  both), including an end-to-end HTTP proof that the per-IP register limit is
  global — a request served by instance B counts hits that only instance A saw.

Unit coverage of the same seam (fake client, no network) stays in
`tests/distributedLimits.test.ts` and `tests/sharedStateResolution.test.ts` and
runs in the fast `npm test` suite everywhere.

## 5. Security

- `DATABASE_URL` / `REDIS_URL` are **never logged** — no step echoes them, and
  the app never returns them (`/ready` and `/health` leak-tested).
- The CI DB/Redis credentials are **ephemeral, job-local, non-production** test
  values. Production credentials come only from the platform secret manager and
  are never committed.
- **TLS for production:** the CI RESP client is plaintext `redis://` on the job's
  loopback (no TLS to terminate in-job); production **must** use `rediss://` (and
  `sslmode=require` for PostgreSQL) with a real hardened client wired at the
  deployment boundary. See [`PRODUCTION-INFRASTRUCTURE.md`](PRODUCTION-INFRASTRUCTURE.md)
  §3–§4.
- Fail-closed posture is unchanged: CI runs in `NODE_ENV=test` to exercise the
  live infra path; the separate production-mode fail-close config checks live in
  `tests/productionHardening.test.ts` and run in the unit suite.
- No wildcard CORS is ever used; `CORS_ORIGIN` is an explicit origin.

## 6. Local vs CI

| | Local (Termux/aarch64) | CI (ubuntu-latest) |
| --- | --- | --- |
| `npm test` (unit) | ✅ runs (in-memory) | ✅ runs |
| `npm run test:integration` | ⏭️ self-skips (no `DATABASE_URL`/`REDIS_URL`) | ✅ runs against real PG + Redis |
| `prisma migrate deploy` | ❌ engine unavailable | ✅ applied to clean DB |
| `npm run build` / `npm run lint` | ✅ | ✅ |

Running `npm run test:integration` locally is a **no-op pass** (the suites skip)
unless you point `DATABASE_URL` / `REDIS_URL` at your own reachable PostgreSQL +
Redis on a Prisma-supported host.

## 7. Provider remains undecided

CI validates the **code paths**, not a deployment. No cloud provider, managed
database, or Redis service has been selected or provisioned. Provider selection
(see [`PRODUCTION-INFRASTRUCTURE.md`](PRODUCTION-INFRASTRUCTURE.md) §19) changes
only configuration and the injected client — never the application code.
