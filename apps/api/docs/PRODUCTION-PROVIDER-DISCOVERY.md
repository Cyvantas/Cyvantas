# Production Provider Discovery (Phase 18A)

**Status: DISCOVERY ONLY. No provider is selected. Nothing is provisioned,
deployed, or purchased. No application source or deployment configuration is
changed by this phase.** This document is a factual, provider-neutral assessment
of what CYVANTAS API needs to run safely off Termux, and a comparison of
infrastructure *architectures* (not a ranking of vendors).

It builds on and does not restate:
[`PRODUCTION-INFRASTRUCTURE.md`](PRODUCTION-INFRASTRUCTURE.md) (deployment
contract), [`CI.md`](CI.md) (Phase 18 live-infra validation),
[`PRODUCTION-HARDENING.md`](PRODUCTION-HARDENING.md) (security posture), and the
per-feature docs.

> Pricing figures below are **indicative only** and may be stale. This assistant's
> knowledge cutoff predates the current date; every number MUST be re-verified
> against the provider's live pricing page before any decision. Do not treat any
> figure here as a quote.

---

## 1. Executive summary

CYVANTAS API is a stateless Fastify 5 / TypeScript service that needs three
production dependencies: **PostgreSQL** (durable relational data via Prisma),
a **Redis-compatible store** (shared rate-limit / abuse-detection counters for
multi-instance correctness), and a **TLS-terminating HTTP edge**. The code is
already provider-neutral: PostgreSQL is selected by `DATABASE_URL`, Redis by
`REDIS_URL` + an injected client factory at the deployment boundary, and both
default safely to in-memory when unset. Readiness/liveness probes, fail-closed
config, secret redaction, and forward-only migrations already exist.

The realistic infrastructure shapes reduce to four (A–D in §11): managed app
platform, VPS/containers, self-hosted everything, or a container platform — each
paired with managed-or-self-hosted PostgreSQL and Redis. This report compares
them factually. **It does not choose one.** The sandbox/challenge runtime is
explicitly **out of scope** and must live behind a separate security boundary in
a later phase (§21).

Key finding: the application is deployable today on any of the four shapes with
**no source change** — selection changes only configuration and the one injected
Redis client. The main open decisions (§24) are hosting shape, region/data
residency (India/Qatar context, §13), managed-vs-self-hosted for each datastore,
and whether multi-instance (hence Redis) is required at launch.

---

## 2. Current CYVANTAS infrastructure requirements

| # | Requirement | Detail | Source of truth |
| - | ----------- | ------ | --------------- |
| 1 | PostgreSQL | Prisma client, forward-only migrations, persistent relational data, TLS, backups, restore | `prisma/schema.prisma`, `src/db/prisma.ts` |
| 2 | Redis-compatible shared state | `SharedStateStore`: GET/SET/INCR/EXPIRE/DEL/PING; atomic increment; TTL; multi-instance consistency; TLS | `src/infra/*` |
| 3 | API runtime | Node.js, Fastify, HTTPS/reverse proxy, env-var secrets, `/health`, `/ready`, graceful shutdown | `src/server.ts`, `src/app.ts` |
| 4 | Future (NOT this phase) | isolated challenge/sandbox infra, optional background jobs, observability, backups, DR | §21, `SANDBOX.md` |

Redis is **required only for multi-instance** deployments; a genuine single
instance may omit it and use the in-memory store (§10).

---

## 3. Current architecture

```
Internet
  ↓
TLS / reverse proxy (edge; terminates HTTPS)
  ↓
CYVANTAS API (N stateless Fastify instances)
  ├── PostgreSQL   (durable state: users, sessions, progress, scoring, environments)
  └── Redis        (shared rate-limit / abuse-detection counters)
        ↓
   SharedStateStore  (provider-neutral seam)
        ↓
   rate limiting + abuse detection
```

- Frontends (`apps/main`, `apps/lab`) are static and **untrusted**; the API
  validates every request at the boundary and derives all authority server-side.
- Only the API talks to PostgreSQL and Redis; neither is internet-reachable.
- The sandbox control plane **does not exist** and is out of scope here (§21).

Application seam facts verified in source:
- `src/server.ts` → `resolveSharedStateStore(config, { redisClientFactory? })`
  is the single deployment boundary; no Redis client is imported.
- `src/infra/sharedStateFactory.ts` is **fail-closed**: `REDIS_URL` set without a
  wired factory throws `SharedStateConfigError` at boot (never silent per-process
  fallback).
- `src/config/env.ts` `loadConfig` is fail-closed in production (mandatory
  `DATABASE_URL`, https-only non-loopback `CORS_ORIGIN`, validated `REDIS_URL`).

---

## 4. PostgreSQL requirements

- **Engine:** PostgreSQL. Prisma `datasource db { provider = "postgresql" }`.
  Enum migrations use `ALTER TYPE … ADD VALUE`, which requires **PostgreSQL 12+**
  (see §9 special handling). Target PG 14–16 (CI uses `postgres:16`).
- **Access:** reachable **only** from the API's private network. No public
  ingress. TLS enforced (`sslmode=require` or provider equivalent).
- **Credentials:** least-privilege application role (DML + the DDL needed for
  `migrate deploy`; not a superuser for steady-state serving).
- **Connections:** one Prisma client per process (`src/db/prisma.ts`), no
  per-request clients. Pool sized for instance count × Prisma pool; a managed
  connection pooler (e.g. PgBouncer-style) is advisable as instances scale.
- **Schema application:** ONLY via `prisma migrate deploy` as an explicit
  deploy step — never from app startup or an HTTP request (§15).
- **Backups / restore:** automated base backup + WAL/PITR where supported;
  encrypted at rest and in transit; restore rehearsed (§17).
- **Replica:** optional; the app queries the primary only today.

---

## 5. Redis requirements

The store is defined by `RedisLikeClient` in `src/infra/redisSharedStateStore.ts`.
The **exact** command surface required (nothing more — no pipelines, transactions,
pub/sub, scans, Lua):

| Store method | Redis command | Notes |
| ------------ | ------------- | ----- |
| `get`       | `GET`    | returns value or null |
| `set`       | `SET key val [EX ttl]` | TTL applied **atomically** on write |
| `increment` | `INCRBY key by` | atomic increment; caller sets `EXPIRE` on first hit |
| `expire`    | `EXPIRE key ttl` | window TTL |
| `delete`    | `DEL key` | |
| `ping`      | `PING` | bounded, fail-closed → boolean; never leaks the URL/driver error |

- **Atomicity:** satisfied. `INCRBY` and `SET … EX` are single-command atomic on
  any Redis-compatible server; the adapter delegates all I/O to the injected
  client and adds no read-modify-write races (§10).
- **TLS:** production **must** use `rediss://`. `parseRedisUrl` accepts
  `redis://` and `rediss://`; the operator's client (ioredis/node-redis) performs
  the TLS handshake.
- **Auth:** password/ACL via the `rediss://user:pass@host` URL, injected from the
  secret manager.
- **Compatibility:** any Redis-compatible engine exposing these six commands
  works (Redis OSS, Valkey, and managed equivalents). No provider is assumed.
- **Requirement scope:** needed **only for multi-instance**. A single instance
  may run the in-memory store.

---

## 6. API runtime requirements

| Aspect | Value | Verified in |
| ------ | ----- | ----------- |
| Runtime | Node.js **24** (CI `node-version: 24`; tsup target node20 — engine ≥20 works, 24 tested) | workflow, `tsup.config.ts` |
| Package manager | npm (`npm ci`, `package-lock.json` present) | `apps/api/package-lock.json` |
| Build | `npm run build` = `tsc --noEmit` typecheck + `tsup` → `dist/server.js` (single ESM) | `package.json` |
| Start | `npm run start` = `node dist/server.js` | `package.json` |
| Runtime deps (external) | `fastify`, `@fastify/cors`, `@fastify/cookie`, `@prisma/client`, `hash-wasm`, `zod` | `package.json` |
| Bind | `HOST` (default `127.0.0.1`), `PORT` (default `8787`) — set `HOST=0.0.0.0` **only** behind a trusted proxy | `src/config/env.ts` |
| Liveness | `GET /health` — dependency-free | `src/routes/health.ts` |
| Readiness | `GET /ready` — DB + shared-state probes, bounded, fail-closed, non-leaky | `src/routes/readiness.ts`, `src/app.ts` |
| Graceful shutdown | `onClose` hook disconnects repositories (Prisma). **Gap:** `src/server.ts` registers **no** SIGTERM/SIGINT handler to call `app.close()` — see §22/§25 | `src/app.ts:221` |
| Statelessness | No local disk/session state; sessions in PostgreSQL, counters in shared store | schema, `src/infra/*` |

Install for production with `npm ci --omit=dev`; run `prisma generate` before
build so the client types exist.

---

## 7. Network architecture

```
                         Internet (HTTPS only)
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
             main frontend        lab frontend      (static/CDN, untrusted)
             cyvantas.in          lab.cyvantas.in
                     │ XHR/fetch (CORS allow-list)
                     ▼
        ┌───────────────────────────────┐
        │  TLS edge / reverse proxy / LB │  terminates HTTPS, health+readiness probes
        └───────────────┬───────────────┘
                        │  private network only
                        ▼
              CYVANTAS API (N stateless instances)   bind behind proxy
                 │                        │
     private/TLS │                        │ private/TLS (rediss://)
                 ▼                        ▼
          ┌────────────┐          ┌────────────────┐
          │ PostgreSQL │          │ Redis-compatible│   NOT internet-reachable
          │ (private)  │          │ (private)       │
          └────────────┘          └────────────────┘
```

Requirements: no public database/redis exposure; API↔datastore traffic on a
private network (VPC/peering/service-mesh) and/or TLS; edge is the only public
surface; firewall default-deny inbound except 443 at the edge.

---

## 8. Security requirements (verification checklist)

| Control | Required | Current state |
| ------- | -------- | ------------- |
| PostgreSQL TLS | Yes | `sslmode=require` via `DATABASE_URL` (operator-set). Not enforced in code — deployment concern. |
| Redis TLS | Yes (prod) | `rediss://` accepted; client performs TLS. |
| Private networking | Yes | Deployment concern; app binds loopback by default. |
| Firewall / network isolation | Yes | Deployment concern; default-deny inbound. |
| No public DB exposure | Yes | Deployment concern; never bind DB publicly. |
| Secret management | Yes | `DATABASE_URL`/`REDIS_URL`/session config from env; `.env` git-ignored; never logged. |
| Database backups | Yes | Provider/self-managed; not app responsibility. |
| Restore testing | Yes | Runbook in `PRODUCTION-INFRASTRUCTURE.md` §12. |
| Encrypted storage | Yes | Provider feature (at-rest). |
| Encrypted transport | Yes | TLS edge + `sslmode=require` + `rediss://`. |
| Least-privilege DB creds | Yes | Operator-provisioned role; app needs no superuser at steady state. |
| Redis authentication | Yes | Password/ACL in `rediss://` URL. |
| Production CORS | Yes | `loadConfig` fail-closed: https-only, non-loopback, no `*`. |
| Secure cookies | Yes | `cookieSecure = (NODE_ENV==="production")`; HttpOnly, SameSite=Lax. |
| Rate limiting | Yes | Fail-closed per-user + per-IP on mutating routes (shared-state backed). |
| API health/readiness | Yes | `/health` (liveness), `/ready` (deps). |
| Log redaction | Yes | `SENSITIVE_KEY_PATTERN`; Prisma log = warn/error only. |
| Audit logging | Yes | `AuditLog` model + `AuditEvent` enum. |
| Environment separation | Yes (process) | `NODE_ENV` gates cookie/CORS/config; distinct DBs per env is a deployment concern. |

No new security control is required by this phase; the gaps are all
**deployment-configuration** items, not code.

---

## 9. Database / migration assessment

Inspected `prisma/schema.prisma` and `prisma/migrations/`.

**Models (10):** `User`, `Role`, `UserRole` (join), `Session`,
`ChallengeProgress`, `ScoreEvent`, `LearningProgress`, `MissionProgress`,
`AuditLog`, `Environment`.
**Enums (5):** `RoleName`, `AuditEvent` (38 values), `EnvironmentStatus`,
`EnvironmentRuntimeStatus`, `EnvironmentType`.

**Important relationships:**
- `User` 1—* `Session`, `UserRole`, `*Progress`, `ScoreEvent`, `AuditLog`,
  `Environment`. Most FKs `ON DELETE CASCADE`; `AuditLog.userId` is
  `ON DELETE SET NULL` (audit trail survives user deletion).
- `UserRole` is a composite-PK join (`userId`,`roleId`) for normalized roles.

**Indexes / unique constraints (highlights):**
- `users.email` unique; `sessions.tokenHash` unique (only token *hashes* stored).
- `score_events (userId, challengeSlug, reason)` **unique** — the once-only
  scoring guarantee; a racing/duplicate submission's second insert fails instead
  of double-scoring.
- Per-user unique keys on each progress table; supporting indexes on
  `sessions.expiresAt`, `audit_logs.event/createdAt`, and six `environments`
  indexes (status/expiry/user composites).

**Migrations (5), forward-only:**
`20260924151259_init` (178 lines), `_environments` (79), `_sandbox_audit_events`
(29), `_challenge_audit_events` (21), `_scoring` (56). Hand-authored SQL (Prisma
engine cannot run on Termux) but authored to match the schema and applied on a
clean DB in CI (Phase 18).

**Production-deployable?** Yes — CI proves `prisma migrate deploy` applies all
five to a clean `postgres:16` and the app boots on the migrated schema.

**Special handling (flag):**
1. **`ALTER TYPE … ADD VALUE` requires PostgreSQL 12+.** All enum-extension
   migrations use it. Target PG ≥12 (14–16 recommended). A newly added enum value
   **cannot be used in the same transaction** it is added — none of the
   migrations do, so this is safe, but any *future* migration must keep enum
   additions in their own migration, separate from data that uses them.
2. **`_environments` uses `ADD VALUE` without `IF NOT EXISTS`** (later migrations
   added the guard). It is not independently idempotent; `migrate deploy` relies
   on the `_prisma_migrations` ledger to never re-run it. Do not manually replay.
3. **No destructive migrations** (no `DROP`/data loss); rollback is
   forward-compensating (§18).

**Backup/restore implications:** small, index-light OLTP schema; standard
base-backup + PITR is sufficient. The append-only `score_events` ledger and
`audit_logs` are the integrity-critical tables — verify their row counts and the
unique constraint after any restore.

---

## 10. Redis / shared-state assessment

Inspected `src/infra/sharedState.ts`, `redisSharedStateStore.ts`,
`sharedStateFactory.ts`.

- **Interface:** `SharedStateStore` = `get/set/increment/expire/delete/ping`.
  Two implementations ship: in-memory (default) and the Redis adapter over
  `RedisLikeClient`. The app installs **no** Redis client.
- **Atomicity requirement — satisfied.** The limiter/detection use a fixed-window
  bucket: `INCRBY` (atomic) then `EXPIRE` on first hit. The live suite proves 200
  concurrent increments settle to exactly 200 against a real broker, and that two
  logical instances share one counter. No CAS/Lua needed because `INCRBY` is
  itself atomic.
- **TTL:** applied atomically on `set` via `SET … EX`; windows via `EXPIRE`.
- **Fail-closed:** `ping()` is bounded (default 1000 ms) and resolves `false` on
  error/timeout, never leaking the URL; the abuse guard treats a store error as a
  denial, never an allow.
- **Selection:** `resolveSharedStateStore` — unset `REDIS_URL` → in-memory; set +
  factory → Redis-backed; set + no factory → **boot refused**.
- **Wiring cost:** one line at `src/server.ts` (`redisClientFactory: (url) => new
  Redis(url)`) plus adding the chosen client to `package.json`. This is the ONLY
  application-adjacent change provider selection implies, and it is deployment
  code, not a core change.
- **Data sensitivity:** stored values are counters keyed by IP/user+window — no
  secrets, no PII beyond IP; safe to lose on failover (limits briefly reset, then
  re-converge). Redis persistence is **not** required for correctness.

---

## 11. Provider architecture options

Four realistic shapes. **No ranking; no winner.** Each pairs an API-runtime model
with datastore choices.

**A. Managed application platform + managed PostgreSQL + managed Redis**
Push code/container; platform builds, runs, scales, and TLS-terminates. Managed
DB + Redis with backups/TLS included.
- *Pro:* lowest ops burden; backups/patching/TLS handled; fast to launch.
- *Con:* higher unit cost; least control; potential egress/region limits.

**B. VPS / container host + managed PostgreSQL + managed Redis**
Run the API on VPS(es) or a small container host you operate; datastores managed.
- *Pro:* control over runtime + cost; datastore reliability outsourced.
- *Con:* you own OS patching, the reverse proxy, and scaling glue.

**C. VPS / container host + self-hosted PostgreSQL + self-hosted Redis**
Everything on machines you operate.
- *Pro:* maximum control, data locality, lowest sticker cost; no datastore lock-in.
- *Con:* you own backups, PITR, TLS, HA, patching, monitoring — highest
  operational risk; a single-node DB is a real SPOF.

**D. Container platform (managed orchestration) + managed PostgreSQL + managed Redis**
Managed Kubernetes/Nomad-style orchestration for the API; managed datastores.
- *Pro:* first-class multi-instance, rolling deploys, autoscaling, probes map
  directly to `/health`+`/ready`.
- *Con:* orchestration complexity/overhead; likely overkill at launch scale.

All four are **compatible with the current code unchanged**; they differ only in
operational model and where responsibility for backups/TLS/scaling sits.

---

## 12. Factual comparison (by architecture, not vendor)

Compared across the requested dimensions. Cells state *what the shape implies*,
not a vendor claim.

| Dimension | A. Managed platform | B. VPS + managed data | C. VPS + self-hosted data | D. Container platform + managed data |
| --------- | ------------------- | --------------------- | ------------------------- | ------------------------------------ |
| Approx. architecture | PaaS runs app; managed PG+Redis | You run app on VPS; managed PG+Redis | You run everything on VPS(es) | Orchestrator runs app; managed PG+Redis |
| Operational complexity | Lowest | Medium | Highest | Medium–High |
| PostgreSQL support | Managed, first-class | Managed | Self-install + operate | Managed |
| Prisma `migrate deploy` | Run as release/deploy step | Run in CI/deploy step | Run in CI/deploy step | Run as init-job/deploy step |
| Redis / TLS | Managed, `rediss://` | Managed, `rediss://` | Self-config TLS + auth | Managed, `rediss://` |
| Private networking | Platform-provided | VPC/private link (managed DB) | Same-host/private LAN | Cluster network + private link |
| Backups | Automated (managed) | Automated for DB (managed) | **You build** (pg_dump/WAL) | Automated for DB (managed) |
| Restore process | Console/API restore | Console/API restore (DB) | Manual runbook | Console/API restore (DB) |
| Scaling | Auto/slider | Manual/scripted | Manual | Orchestrated autoscale |
| Multi-instance | Native (needs Redis) | Yes (needs Redis + LB) | Yes (needs Redis + LB) | Native (needs Redis) |
| Secrets mgmt | Platform secrets | Platform/manager + env | You provide (vault/env) | Orchestrator secrets |
| Logging | Aggregated (built-in) | Ship stdout yourself | Ship stdout yourself | Cluster logging |
| Monitoring | Built-in basics | DB metrics managed; app DIY | All DIY | Cluster + DB metrics |
| Deployment model | git/image push | image/systemd/compose | image/systemd/compose | rolling deploy |
| Rollback model | Redeploy prev release | Redeploy prev image | Redeploy prev image | Rollout undo |
| Data residency | Region menu (varies) | DB region menu | **You choose host region** | Region menu (varies) |
| Entry cost (indicative) | Highest per unit | Medium | Lowest sticker | Medium–High |
| Limitations | Least control; egress caps | Glue work; you own proxy | You own all reliability | Orchestration overhead |
| Lock-in | Highest (platform APIs) | Low–medium (DB APIs) | Lowest | Medium (orchestrator + DB) |

**Non-negotiables regardless of shape:** managed or self-hosted, the datastores
must be private-only, TLS-enforced, backed up with a *tested* restore, and
credentialed least-privilege. Multi-instance requires Redis + a load balancer.

---

## 13. Region / data-location considerations (India / Qatar context)

CYVANTAS operates from India/Qatar contexts. **This report does not infer legal
or regulatory requirements** — it only identifies the *technical* selection
factors to resolve before choosing a provider:

- **Provider region availability:** confirm the provider offers a region in or
  near the intended jurisdiction (e.g. an India region such as Mumbai; Qatar or
  the nearest Gulf/Middle-East region). Availability varies by provider and by
  service (a compute region may exist without managed PG/Redis in the same region).
- **Where PostgreSQL data resides:** the managed-DB region determines the
  physical location of primary data. Pick the DB region explicitly; do not accept
  a provider default.
- **Where backups reside:** backups may default to the same region or replicate
  cross-region. Confirm backup region and whether it can be pinned.
- **Region selectability:** confirm the region is selectable at creation (many
  managed DBs cannot be moved region after creation — it requires dump/restore).
- **Cross-region replication:** confirm whether read replicas / DR replicas can
  be placed in a second region if a residency or DR requirement emerges.

**Action for Phase 19 prerequisites:** obtain (from the business/legal owner) any
data-residency constraint, then filter providers by region availability for
*all three* of compute, managed PostgreSQL, and managed Redis simultaneously.

---

## 14. Cost considerations

**Indicative only; verify against live pricing before deciding.** Figures depend
on region (India/Qatar regions often price differently from US/EU), instance
size, and bandwidth. Break down every quote into these line items:

| Line item | What drives it | Notes |
| --------- | -------------- | ----- |
| Compute (API) | instance size × count × hours | 1 small instance to start; +1 for HA |
| PostgreSQL | instance size + storage + IOPS | smallest managed tier suffices at launch |
| Redis | instance size (memory) | tiny; counters only — smallest tier |
| Bandwidth / egress | GB out (API + DB cross-AZ) | often the surprise cost; check egress rates |
| Backups | retained GB + PITR window | usually small for this schema |
| Monitoring / logs | ingested GB / metrics | can dominate if verbose logging is shipped |

**Estimated monthly baseline (order-of-magnitude, unverified):** a minimal
single-region setup — one small API instance, one smallest managed PostgreSQL,
one smallest managed Redis, light bandwidth — typically lands in the **low tens
of USD per month** on VPS/self-managed shapes and **higher on fully-managed
platforms**, before HA (a second instance + DB HA roughly multiplies the compute
and DB lines). **Do not treat this as a quote.** Redis can be omitted entirely
while single-instance, removing that line.

---

## 15. Deployment architecture

Production runtime contract (verified against source; unchanged by this phase):

1. Install: `npm ci --omit=dev` in `apps/api`.
2. Generate client: `prisma generate` (Prisma client types).
3. Build: `npm run build` (`tsc --noEmit` + tsup → `dist/server.js`).
4. **Migrate: `prisma migrate deploy`** as an explicit, ordered release step —
   **before** new instances serve traffic; never from app startup.
5. Start: `node dist/server.js` with env from the secret manager.
6. Bind behind the TLS edge; set `HOST`/`PORT` for the proxy; `NODE_ENV=production`.
7. Edge wires liveness → `GET /health`, readiness gate → `GET /ready`.
8. Roll instances one at a time; each joins rotation only after `/ready` = 200.

**Migration execution strategy:** run `migrate deploy` as a **single serialized
release job** (one runner), not per-instance, to avoid concurrent DDL. Because
several migrations are enum extensions (§9), ensure the target is PG ≥12 and that
the release job completes before instances that depend on new enum values start.

**Graceful shutdown (gap to close in Phase 19):** the app defines an `onClose`
hook (Prisma disconnect) but `src/server.ts` installs no SIGTERM/SIGINT handler
to invoke `app.close()`. For zero-downtime rolling deploys, add a signal handler
that calls `app.close()` (drains in-flight requests, runs `onClose`) — this is a
small, isolated addition, noted as a Phase 19 prerequisite (§25), **not made now**.

---

## 16. CI/CD architecture

**Existing (Phase 18):** `.github/workflows/api-integration.yml` provisions
ephemeral `postgres:16` + `redis:7`, then runs install → `prisma generate` →
`prisma migrate deploy` → lint → build → unit tests → live integration tests. It
validates the real code paths but **deploys nothing**.

**How production deploy connects later — WITHOUT changing app architecture:** add
a *separate* deploy workflow (or extend with an environment-gated `deploy` job)
that reuses the same build + migrate steps and injects real secrets from the CI
secret store / provider. The application requires **no** change: the same
`DATABASE_URL`/`REDIS_URL`/`CORS_ORIGIN`/`NODE_ENV` contract and the same
`migrate deploy` step already exist.

**Recommended pipeline structure:**

```
test  →  build  →  migration validation  →  deploy  →  health  →  readiness  →  smoke tests
```

- **test:** unit + live integration (current Phase 18 job).
- **build:** `tsc` + tsup artifact / container image.
- **migration validation:** `migrate deploy` against a scratch DB (as CI already
  does) and, at release time, against the real DB as the serialized release job.
- **deploy:** ship the built artifact/image; inject secrets at runtime.
- **health:** poll `GET /health` until the process is up.
- **readiness:** gate rollout on `GET /ready` = 200 (DB + shared-state ok).
- **smoke tests:** minimal post-deploy checks (e.g. register→login→logout, `/ready`
  shape, no-secret-leak) — a subset mirroring the live suite.

Keep deploy credentials in the CI/provider secret store; never echo
`DATABASE_URL`/`REDIS_URL`.

---

## 17. Backup / restore architecture

- **Backups:** automated daily base backup + continuous WAL for PITR where the
  DB shape supports it (managed: enable; self-hosted: build with `pg_basebackup`
  + WAL archiving). Store **off** the primary host; encrypt at rest and in transit.
- **Retention:** per data-retention policy (e.g. 7 daily / 4 weekly) — a policy
  decision for the owner, not set here.
- **Restore process:** provision a scratch instance, restore latest base backup,
  replay WAL to the target timestamp, point a scratch API at it, and verify.
- **Restore verification:** run `npm test` + a smoke login/challenge-submit
  against the restored DB, and confirm `score_events`/`audit_logs` integrity
  (row counts + the once-only unique constraint). *An untested backup is not a
  backup.*
- **Redis:** **no backup required for correctness** — counters are ephemeral and
  re-converge after loss (§10). Do not rely on Redis persistence for any durable
  data; nothing durable lives there.

---

## 18. Rollback strategy

- **Application rollback:** redeploy the previous known-good image/release.
  Instances are stateless → safe and fast.
- **Migration rollback limitations:** migrations are **forward-only**; there are
  no down-migrations. Prefer a **compensating forward migration**. Enum
  `ADD VALUE` is **not reversible** in PostgreSQL (a value cannot be dropped from
  an enum) — treat enum additions as permanent; never plan to "roll back" one.
- **Database restore:** for catastrophic corruption only, restore from the
  pre-change backup (§17) and accept the data-loss window (RPO). This is the last
  resort, not a routine rollback.
- **Redis state behavior:** flushing/losing Redis only resets rate-limit /
  detection windows; no durable impact. On failover, counters restart and
  re-converge — acceptable by design (fail-closed guard still denies on errors).
- **Secret rotation:** rotate `DATABASE_URL`/`REDIS_URL`/session config in the
  secret manager, then roll instances; sessions survive (server-side rows) unless
  intentionally mass-revoked (`revokedAt` update / table truncate).
- **Failed deployment handling:** if `/ready` never reaches 200, the LB keeps the
  instance out of rotation; abort the rollout and redeploy the previous release.
  Because `migrate deploy` ran as a serialized pre-step, a failed *app* deploy
  leaves the (forward-compatible) schema intact.

---

## 19. Secrets strategy

- **Never committed:** `DATABASE_URL`, Redis URL/credentials, session config,
  any provider tokens/keys. `.env` is git-ignored; `.env.example` holds
  placeholders only.
- **Source of truth:** the hosting platform / CI secret manager injects secrets
  as environment variables at runtime (not build-time bake-in, not in the image).
- **Least privilege:** the DB role has only the privileges it needs (DML +
  migration DDL); Redis uses an auth'd ACL user scoped to the keyspace.
- **Never surfaced:** secrets are never logged (Prisma warn/error only;
  `SENSITIVE_KEY_PATTERN` redaction) and never returned by any response —
  `/ready` and `/health` are leak-tested.
- **Rotation:** rotate in the secret manager, then roll instances (§18); the app
  reads config once at boot via `loadConfig`.

---

## 20. Monitoring / observability

- **Structured events:** the API emits redaction-safe JSON-line security events
  to stdout; ship the stream to a log sink. Flags/passwords/tokens can never reach
  a log line.
- **Correlation:** `X-Request-Id` on every response and error envelope for tracing.
- **Health signals:** wire alerts on `/ready` flapping, 5xx rate,
  `…_ABUSE_SUSPECTED` event volume, and DB connection-pool saturation.
- **Metrics to add later (not this phase):** request latency/throughput,
  DB/Redis latency, instance count vs. limit-hit rate. No metrics endpoint exists
  today; a provider's platform metrics or a future `/metrics` addition would fill
  this — a Phase 19+ decision.
- **Detection is observe-only:** it escalates events above the rate-limit
  thresholds; the rate limiter (not detection) denies requests.

---

## 21. Sandbox boundary

**The challenge/sandbox runtime is explicitly NOT part of the normal API host and
is out of scope for this phase.**

- Today the runtime is the `notConfiguredRuntimeProvider` seam: `runtimeStatus`
  is always `NOT_PROVISIONED`, `runtimeConfigured` is `false`. **No container,
  socket, process, or outbound call exists.**
- When a real sandbox is built (a future, separately-reviewed phase) it MUST run
  in its **own security boundary / trust zone** — separate hosts/network, its own
  control plane and worker nodes — never on the API instances that hold DB/Redis
  credentials. It requires isolation infrastructure, a dedicated security review,
  real Docker-socket / host-FS / capability tests, and an explicit opt-in flag.
- Provider selection for the *API tier* should therefore also consider whether
  the provider offers a **path to host an isolated sandbox tier separately** —
  but the sandbox itself is **not** provisioned, designed, or costed here.

---

## 22. Operational requirements

To run safely off Termux, the operator must own:

- **TLS edge / reverse proxy** terminating HTTPS 443, forwarding to API instances
  on a private network; liveness→`/health`, readiness→`/ready`.
- **Private networking** so PostgreSQL/Redis are never internet-reachable;
  default-deny inbound firewall except 443 at the edge.
- **Secret injection** at runtime from a secret manager (§19).
- **Migration release job** running `prisma migrate deploy` serialized, pre-rollout.
- **Backups + tested restore** for PostgreSQL (§17); PITR where supported.
- **Log/metric shipping** for stdout JSON events and platform metrics (§20).
- **Graceful-shutdown handler** (SIGTERM→`app.close()`) — code gap to close in
  Phase 19 (§15, §25) for zero-downtime rolls.
- **Environment separation** — distinct DB (and Redis keyspace) per environment
  (staging vs prod); never share a database across environments.
- **Node 24 runtime** (or ≥20) with `npm ci --omit=dev`.

---

## 23. Provider-selection criteria

When a provider is chosen (a later decision), require that it offers, in the
target region(s):

- [ ] Managed **or** operable PostgreSQL **≥12** (14–16 preferred), TLS, automated
      backups + PITR, region-pinnable data and backups.
- [ ] A Redis-compatible store (only if multi-instance) with TLS + auth.
- [ ] Runtime **secret injection** (not build-time bake-in).
- [ ] A **TLS-terminating edge/LB** with configurable liveness + readiness probes
      and per-instance rotation.
- [ ] **Private networking** between API and datastores; no public DB/Redis.
- [ ] **Stateless horizontal scaling** for the API tier.
- [ ] **Region availability** for compute + managed PG + managed Redis
      *simultaneously* in the intended jurisdiction (§13).
- [ ] **Log aggregation** for stdout JSON lines; basic metrics.
- [ ] A **separate, isolable path** to host the future sandbox tier (§21).
- [ ] Acceptable **cost** per the §14 line-item breakdown (verified live).
- [ ] Acceptable **lock-in** profile (portability of data + deploy model).

Keep the API code provider-neutral — selection changes only configuration and the
one injected Redis client, never the application code.

---

## 24. Open decisions

Unresolved and deliberately **not** decided in this phase:

1. **Hosting shape** — A, B, C, or D (§11). No selection made.
2. **Managed vs self-hosted** for PostgreSQL and for Redis (independently).
3. **Multi-instance at launch?** — determines whether Redis is required from day
   one or deferred (single instance can omit it).
4. **Region / data residency** — pending a residency constraint from the
   business/legal owner (§13); drives provider filtering.
5. **Specific provider(s)** — none chosen; §23 is the selection rubric.
6. **Observability depth** — platform metrics only, or add a metrics endpoint
   later (§20).
7. **HA target** — single instance vs. HA pair + DB HA (affects cost, §14).
8. **CI deploy job design** — how the deploy workflow injects prod secrets (§16).

---

## 25. Prerequisites for Phase 19

Before Phase 19 (production selection & provisioning) can begin, resolve/prepare:

1. **Answer the §24 open decisions** — at minimum: hosting shape, region, and
   whether multi-instance (Redis) is needed at launch.
2. **Confirm data-residency constraints** (§13) from the owner and verify a
   provider region serving compute + managed PG + managed Redis together.
3. **Provision plan (not executed here):** managed/self-hosted PostgreSQL ≥12
   (TLS, backups, PITR) and, if multi-instance, a Redis-compatible store (TLS,
   auth), both private-only.
4. **Code prerequisite — graceful shutdown:** add a SIGTERM/SIGINT handler in
   `src/server.ts` calling `app.close()` (small, isolated; §15/§22). Not done in
   18A (no source changes permitted).
5. **Code prerequisite — Redis client wiring:** if multi-instance, add the chosen
   client (ioredis/node-redis) to `package.json` and wire `redisClientFactory` at
   `src/server.ts` (the one-line seam already exists).
6. **Secret manager** chosen and populated with `DATABASE_URL`, `REDIS_URL`,
   `CORS_ORIGIN` (https, exact), `NODE_ENV=production` (§19).
7. **Deploy pipeline** extending Phase 18 CI with an environment-gated deploy job
   and post-deploy health/readiness/smoke gates (§16).
8. **Backup/restore runbook rehearsed** on the chosen PostgreSQL (§17).
9. **Sandbox tier** confirmed out of scope and, if planned, allocated its own
   separate, reviewed phase and isolated infrastructure (§21).

**None of the above is performed in Phase 18A.** This document is the discovery
artifact only.

---

*End of Phase 18A discovery report. No provider selected, nothing provisioned or
deployed, no application source or deployment configuration modified.*
