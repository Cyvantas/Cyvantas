# CYVANTAS Security Lab API

Backend for the CYVANTAS Security Lab: a safe-by-default Fastify + TypeScript
service. It serves the Lab's public content (challenges, learning paths,
missions), and — as of **Phase 8** — provides an authentication + database
foundation (users, sessions, roles, progress). Environment/flag features remain
contract stubs for later phases.

> **Status.** Phase 7 content endpoints + Phase 8 auth/database foundation.
> Still **no** sandbox/containers, no command execution, no real flag
> validation, and no outbound network. See [Current limitations](#current-limitations).

## Authentication & database

Phase 8 adds cookie-based sessions backed by PostgreSQL (via Prisma), Argon2id
password hashing, server-side roles/authorization, rate limiting, CSRF
protection, and an audit log. **Full details — data model, cookies, CSRF,
password policy, roles, rate limits, and setup — are in
[`docs/AUTH.md`](docs/AUTH.md).**

Persistence is behind repository interfaces with two implementations: **Prisma**
(when `DATABASE_URL` is set) and **in-memory** (when unset — for local dev
without a DB, and for tests).

## Purpose

- Serve the existing Lab catalog (`apps/lab/src/data/*`) as **read-only public
  metadata** through a stable HTTP contract, so the Lab frontend's providers can
  adopt a real API later without UI changes.
- Establish the response envelope, error model, and route surface that future
  phases build on.
- Reserve the environment / progress / flag endpoints as honest `501` stubs —
  present in the contract, explicitly not implemented.

## Architecture

```
src/
  config/env.ts          host/port, non-wildcard CORS, DB/session/cookie config
  types/api.ts           { data } / { error:{code,message,status} } envelope + ApiError
  domain/                roles (const union) + AuthUser/UserDTO mapping
  security/              password (argon2id), tokens, rate limiter, CSRF
  db/prisma.ts           single Prisma client + clean shutdown
  repositories/          interfaces + Prisma impl + in-memory impl + factory
  services/
    authService.ts       register/login/logout/session resolution
    sessionCleanup.ts    delete expired sessions (function, no scheduler)
    catalogService.ts    reuses apps/lab data → public DTOs (whitelisted fields)
  validation/authSchemas.ts  Zod schemas (email/password/displayName)
  plugins/auth.ts        request auth context + requireAuth/requireRole guards
  routes/
    health.ts            GET /health
    index.ts             /api/v1 root + registers all v1 sub-routes
    auth.ts              /api/v1/auth register|login|logout|me
    challenges.ts        GET /api/v1/challenges[/:slug]
    learning.ts          GET /api/v1/learning[/:slug]
    missions.ts          GET /api/v1/missions[/:slug]
    environments.ts      full lifecycle (Phase 9)
    progress.ts          501 stub
    flags.ts             501 stub
  app.ts                 buildApp(): Fastify + CORS + cookie + auth + routes
  server.ts              loads config, binds to 127.0.0.1
prisma/                  schema.prisma + migrations/
tests/                   vitest via app.inject (no real sockets; no DB required)
```

The catalog service imports the Lab data directly (single source of truth) and
maps each record to a **public DTO** that whitelists only shippable fields —
challenge hints/objectives, internal ids, and runtime status are never exposed.

## Local setup

PostgreSQL is not assumed to be installed. Two supported modes:

**In-memory (no database)** — leave `DATABASE_URL` unset:

```bash
cd apps/api
npm install
cp .env.example .env        # keep DATABASE_URL commented / unset
npx prisma generate         # generate Prisma client types (needed by the build)
npm run dev                 # tsx watch, http://127.0.0.1:8787
```

**PostgreSQL (production-like)** — set `DATABASE_URL` in `.env`:

```bash
npm install
cp .env.example .env        # set a real DATABASE_URL
npx prisma generate
npx prisma migrate dev      # apply prisma/migrations to your database
npm run dev
```

See [`docs/AUTH.md`](docs/AUTH.md) for `migrate reset`, the test-database
strategy, and a build-host platform note (Prisma engines / PostgreSQL
availability).

Smoke test:

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
curl http://127.0.0.1:8787/api/v1
curl http://127.0.0.1:8787/api/v1/challenges
```

## Environment variables

The service stores **no secrets** in git; `DATABASE_URL` is the only sensitive
value and belongs only in your local `.env`.

| Variable              | Default                  | Notes                                             |
| --------------------- | ------------------------ | ------------------------------------------------- |
| `NODE_ENV`            | `development`            | `production` requires `DATABASE_URL`; Secure cookies. |
| `PORT`                | `8787`                   | 1–65535.                                          |
| `HOST`                | `127.0.0.1`              | Loopback by default; not reachable off-host.      |
| `CORS_ORIGIN`         | `http://localhost:5173`  | Comma-separated allow-list. `*` is rejected. Also the CSRF allow-list. **Production: mandatory, https-only, no loopback.** |
| `DATABASE_URL`        | *(unset → in-memory)*    | PostgreSQL connection string (Prisma).            |
| `REDIS_URL`           | *(unset → in-memory)*    | Optional `redis://`/`rediss://` shared-state URL. Required only for **multi-instance** rate-limit correctness; validated on boot. The deployment boundary (`src/server.ts` → `resolveSharedStateStore`) builds a `RedisLikeClient` from it and selects the Redis-backed `SharedStateStore` (`src/infra/redisSharedStateStore.ts`). Set without a wired client factory → boot refused fail-closed (never a silent per-process fallback). No provider is selected; never logged. |
| `SESSION_COOKIE_NAME` | `cyv_session`            | Session cookie name.                              |
| `SESSION_TTL`         | `604800` (7 days)        | Seconds, range 60..7776000.                       |
| `SECURITY_EVENT_LOG`  | `true` (except test)     | Emit security events as JSON lines to stdout.     |
| `SECURITY_FAILED_AUTH_THRESHOLD` | `8`           | Failed-auth escalation (per ip/user) / 15 min. Observe-only. |
| `SECURITY_SUBMISSION_THRESHOLD`  | `40`          | Challenge submissions per user / 1 min. Observe-only. |
| `SECURITY_ENV_ACTIVITY_THRESHOLD`| `40`          | Env create/reset per user / 1 min. Observe-only.  |
| `SECURITY_INVALID_SESSION_THRESHOLD` | `12`      | Invalid sessions per ip / 5 min. Observe-only.    |
| `SECURITY_REQUEST_BURST_THRESHOLD`   | `600`     | Requests per ip / 1 min. Observe-only.            |

Detection thresholds above are **observe-only** — they never deny a request (the
rate limiter does). See [`docs/MONITORING.md`](docs/MONITORING.md) and
[`docs/ABUSE-CONTROLS.md`](docs/ABUSE-CONTROLS.md).

Copy `.env.example` → `.env` for overrides. `.env` is git-ignored; never commit it.

## Development

```bash
npm run dev     # watch-mode server (tsx)
npm run lint    # eslint
npm run test    # vitest (run once)
```

## Testing

```bash
npm run test
```

Tests exercise the app in-process via Fastify's `inject()` — no real sockets are
opened. A dedicated test spies on `globalThis.fetch` and asserts the catalog path
performs **no outbound network request**.

## Production build

```bash
npm run build   # tsc --noEmit (typecheck) + tsup bundle → dist/server.js
npm run start   # node dist/server.js
```

`tsup` bundles the server and the reused Lab data into a single ESM file; runtime
deps (`fastify`, `@fastify/cors`, `@fastify/cookie`, `@prisma/client`,
`hash-wasm`, `zod`) stay external and resolve from `node_modules`.

Before deploying, work through the pre-production checklist, deployment
architecture, and disaster-recovery procedures in
[`docs/PRODUCTION-HARDENING.md`](docs/PRODUCTION-HARDENING.md). In production the
config loader is fail-closed: `DATABASE_URL` and an https-only, non-loopback
`CORS_ORIGIN` are mandatory, and every response carries baseline security headers
(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Cross-Origin-Resource-Policy`, `Content-Security-Policy`, plus HSTS).

## Endpoint overview

| Method | Path                                | Status | Description                          |
| ------ | ----------------------------------- | ------ | ------------------------------------ |
| GET    | `/health`                           | 200    | Liveness + service metadata.         |
| GET    | `/ready`                            | 200/503| Readiness: DB + shared-state probes. |
| GET    | `/api/v1`                           | 200    | API root descriptor.                 |
| POST   | `/api/v1/auth/register`             | 201    | Create user + session; sets cookie.  |
| POST   | `/api/v1/auth/login`                | 200/401| Start session; `INVALID_CREDENTIALS`.|
| POST   | `/api/v1/auth/logout`               | 200/401| Revoke session; clears cookie.       |
| GET    | `/api/v1/auth/me`                   | 200/401| Current user + roles.                |
| GET    | `/api/v1/challenges`                | 200    | Public challenge list.               |
| GET    | `/api/v1/challenges/:slug`          | 200/404| One challenge. `CHALLENGE_NOT_FOUND`.|
| GET    | `/api/v1/learning`                  | 200    | Public learning-path list.           |
| GET    | `/api/v1/learning/:slug`            | 200/404| One path. `LEARNING_PATH_NOT_FOUND`. |
| GET    | `/api/v1/missions`                  | 200    | Public mission list.                 |
| GET    | `/api/v1/missions/:slug`            | 200/404| One mission. `MISSION_NOT_FOUND`.    |
| POST   | `/api/v1/environments`              | 201    | Create env. Auth. `Idempotency-Key`. |
| GET    | `/api/v1/environments`              | 200    | List the caller's environments.      |
| GET    | `/api/v1/environments/:id`          | 200/404| One env (404 hides others' ids).     |
| POST   | `/api/v1/environments/:id/start`    | 200    | Move toward ACTIVE (no real runtime).|
| POST   | `/api/v1/environments/:id/touch`    | 200    | Slide the TTL (capped by lifetime).  |
| POST   | `/api/v1/environments/:id/reset`    | 200    | Reset back to READY.                 |
| POST   | `/api/v1/environments/:id/stop`     | 200    | Stop ACTIVE → READY (idempotent).    |
| DELETE | `/api/v1/environments/:id`          | 200    | Destroy (terminal, idempotent).      |
| GET    | `/api/v1/progress`                  | 501    | `PROGRESS_SERVICE_NOT_IMPLEMENTED`   |
| POST   | `/api/v1/flags/submit`              | 501    | `FLAG_SERVICE_NOT_IMPLEMENTED`       |

## Response format

Success:

```json
{ "data": { } }
```

Error:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "status": 400 } }
```

Error handling covers `400` (validation), `404` (unknown route/slug), `500`
(unexpected — generic message, no stack trace), and `501` (not implemented).

## Current limitations

Phase 9 adds the **environment lifecycle** (persistent records, state machine,
ownership, per-user limits, TTL, reset/destroy, idempotency, auditing) on top of
the Phase 8 auth/database foundation. Crucially, it provisions **nothing**: the
runtime provider is the "not configured" implementation, so `runtimeStatus`
stays `NOT_PROVISIONED` and every DTO reports `runtimeConfigured: false`. The
service still does **not** implement — and never performs — any of the following:

- containers, sandboxes, Docker/Kubernetes, or command/shell execution
- `start` never launches a process; it only advances the lifecycle record and
  is honest that no runtime exists (Phase 10 will attach a real provider)
- flag validation or scoring (submissions are never marked "correct")
- outbound network requests, URL proxying, or SSRF primitives
- a scheduler/cron — `cleanupExpiredEnvironments` is a plain function invoked on
  demand; the idempotency store is per-process and **not** horizontally scalable
  (the rate limiter/detection counters, by contrast, go through a
  `SharedStateStore` and become global once the Redis-backed store is injected)
- a frontend login UI (the Lab frontend remains backend-disabled)
- secrets in git (`DATABASE_URL` lives only in your local `.env`)

Environment lifecycle, statuses, endpoints, limits, and TTL are documented in
[`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

Phase 11 adds the first **isolated educational challenge** (`reflected-xss`) and
**server-authoritative flag submission** at `POST /api/v1/challenges/:slug/submit`
(returns only `{ correct }`; the flag never leaves the server). It reuses the
same runtime seam, so it provisions nothing and never fakes a live target. The
older `/flags/submit` stub remains unimplemented (501). Full contract, trust
model, and security guarantees are in [`docs/CHALLENGES.md`](docs/CHALLENGES.md).

Phase 13 adds **monitoring + abuse controls**: structured, redaction-safe
security events funneled through a single monitor (by wrapping the audit seam,
with zero service changes), request **correlation ids** (`x-request-id`, echoed
on every response and attached to error envelopes), observe-only **detection**
of failed-auth / submission / environment / invalid-session / burst anomalies,
and **fail-closed** per-user + per-IP rate limits on every mutating endpoint. No
flag, password, session token, or authorization header is ever logged. See
[`docs/MONITORING.md`](docs/MONITORING.md) and
[`docs/ABUSE-CONTROLS.md`](docs/ABUSE-CONTROLS.md).

Phase 14 is a **production-hardening** pass (no new runtime capability): the
config loader is fail-closed in production (mandatory `DATABASE_URL` and an
https-only, non-loopback `CORS_ORIGIN`), every response carries baseline security
headers, the inbound `X-Request-Id` is charset-guarded, and a pre-production
checklist plus deployment and disaster-recovery procedures are documented in
[`docs/PRODUCTION-HARDENING.md`](docs/PRODUCTION-HARDENING.md).

Additionally, on the aarch64 Android/Termux build host, Prisma's native
query/schema engines cannot run and PostgreSQL is not installed, so live DB
queries and `prisma migrate dev` require a Prisma-supported host. The in-memory
path, build, and tests run without a database. See [`docs/AUTH.md`](docs/AUTH.md).

Phase 15 is **production-infrastructure readiness** (no new runtime capability):
a dependency-probing readiness endpoint (`GET /ready`, DB + shared-state, bounded
and fail-closed) distinct from the dependency-free liveness `GET /health`; a
small DB readiness abstraction over the existing Prisma client (`SELECT 1`, no
migration); a provider-neutral `SharedStateStore` interface (in-memory impl only,
Redis adapter contract documented); an optional validated `REDIS_URL`; and a full
provider-neutral deployment/backup/rollback runbook in
[`docs/PRODUCTION-INFRASTRUCTURE.md`](docs/PRODUCTION-INFRASTRUCTURE.md). Nothing
is deployed or provisioned and no provider is selected.

Phase 16 makes the rate limiter and abuse-detection counters **distributed-ready**
(no new runtime capability, no new endpoints or env vars): `RateLimiter.check`
and `DetectionTracker.record` now read/write through the Phase 15
`SharedStateStore` (fixed-window `INCR`+`EXPIRE` bucket keyed by the window
start), so the default in-memory store preserves exact single-instance behaviour
while a shared store makes the same limits global across replicas. A
provider-neutral Redis adapter (`src/infra/redisSharedStateStore.ts`) maps the
store contract onto any injected `RedisLikeClient` (atomic `SET … EX`,
`INCRBY`/`EXPIRE`/`DEL`, bounded fail-closed `ping()`) — no Redis client package
is installed and no provider is selected; a deployment constructs the client from
`REDIS_URL` and injects the Redis-backed store. The abuse guard remains
fail-closed (a store error is a denial, never an allow).

Phase 17 completes the **deployment-boundary selection** of that shared state
(no new runtime capability, no new endpoints or env vars). `src/server.ts` now
resolves the store via `resolveSharedStateStore` (`src/infra/sharedStateFactory.ts`):
in-memory when `REDIS_URL` is unset; a Redis-backed store when `REDIS_URL` is set
**and** a provider-neutral `RedisLikeClient` factory is injected at the boundary;
and a **fail-closed boot error** when `REDIS_URL` is set without a wired client —
so the service never silently keeps per-process counters when a shared store was
requested. No Redis client package is installed and **no provider is selected**;
the operator supplies the client. The enforcement path is async end-to-end and
fail-closed (verified, unchanged from Phase 16). Multi-instance deployment still
requires a real Redis-compatible backend, and Prisma migrations still require a
supported host — this phase provisions **no** infrastructure.

The API binds to `127.0.0.1` by default and uses an explicit, non-wildcard CORS
allow-list. See `docs/API.md` and `apps/lab/docs/LAB-BACKEND-ARCHITECTURE.md` for
the full contract and the phased roadmap.
