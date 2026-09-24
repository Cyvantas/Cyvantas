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
    environments.ts      501 stubs
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
| `CORS_ORIGIN`         | `http://localhost:5173`  | Comma-separated allow-list. `*` is rejected. Also the CSRF allow-list. |
| `DATABASE_URL`        | *(unset → in-memory)*    | PostgreSQL connection string (Prisma).            |
| `SESSION_COOKIE_NAME` | `cyv_session`            | Session cookie name.                              |
| `SESSION_TTL`         | `604800` (7 days)        | Seconds, range 60..7776000.                       |

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

## Endpoint overview

| Method | Path                                | Status | Description                          |
| ------ | ----------------------------------- | ------ | ------------------------------------ |
| GET    | `/health`                           | 200    | Liveness + service metadata.         |
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
| POST   | `/api/v1/environments`              | 501    | `ENVIRONMENT_SERVICE_NOT_IMPLEMENTED`|
| GET    | `/api/v1/environments/:id`          | 501    | stub                                 |
| POST   | `/api/v1/environments/:id/start`    | 501    | stub                                 |
| POST   | `/api/v1/environments/:id/reset`    | 501    | stub                                 |
| POST   | `/api/v1/environments/:id/stop`     | 501    | stub                                 |
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

Phase 8 adds authentication, sessions, roles, and a PostgreSQL/Prisma
persistence foundation (with an in-memory fallback). By design, the service
still does **not** implement — and never performs — any of the following:

- environment provisioning, containers, sandboxes, or command execution
- flag validation or scoring (submissions are never marked "correct")
- outbound network requests, URL proxying, or SSRF primitives
- a scheduler/cron (session cleanup is a plain function, invoked on demand)
- Redis or any shared store — the rate limiter is per-process and **not**
  horizontally scalable (see [`docs/AUTH.md`](docs/AUTH.md))
- a frontend login UI (the Lab frontend remains backend-disabled)
- secrets in git (`DATABASE_URL` lives only in your local `.env`)

Additionally, on the aarch64 Android/Termux build host, Prisma's native
query/schema engines cannot run and PostgreSQL is not installed, so live DB
queries and `prisma migrate dev` require a Prisma-supported host. The in-memory
path, build, and tests run without a database. See [`docs/AUTH.md`](docs/AUTH.md).

The API binds to `127.0.0.1` by default and uses an explicit, non-wildcard CORS
allow-list. See `docs/API.md` and `apps/lab/docs/LAB-BACKEND-ARCHITECTURE.md` for
the full contract and the phased roadmap.
