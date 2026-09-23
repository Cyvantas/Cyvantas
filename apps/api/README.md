# CYVANTAS Security Lab API

Phase 7 backend **skeleton** for the CYVANTAS Security Lab. It exposes the Lab's
public content (challenges, learning paths, missions) over a small, safe-by-default
Fastify + TypeScript service, and declares contract stubs for features that arrive
in later phases (environments, progress, flags).

> **Status: skeleton.** No authentication, no database, no persistence, no
> sandbox/containers, no command execution, no outbound network. See
> [Current limitations](#current-limitations).

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
  config/env.ts          loopback host, port, non-wildcard CORS (no secrets)
  types/api.ts           { data } / { error:{code,message,status} } envelope + ApiError
  services/catalogService.ts  reuses apps/lab data → public DTOs (whitelisted fields)
  routes/
    health.ts            GET /health
    index.ts             /api/v1 root + registers all v1 sub-routes
    challenges.ts        GET /api/v1/challenges[/:slug]
    learning.ts          GET /api/v1/learning[/:slug]
    missions.ts          GET /api/v1/missions[/:slug]
    environments.ts      501 stubs
    progress.ts          501 stub
    flags.ts             501 stub
  app.ts                 buildApp(): Fastify + CORS + error/404 handlers + routes
  server.ts              loads config, binds to 127.0.0.1
tests/                   vitest via app.inject (no real sockets)
```

The catalog service imports the Lab data directly (single source of truth) and
maps each record to a **public DTO** that whitelists only shippable fields —
challenge hints/objectives, internal ids, and runtime status are never exposed.

## Local setup

```bash
cd apps/api
npm install
cp .env.example .env   # optional; defaults are safe
npm run dev            # tsx watch, http://127.0.0.1:8787
```

Smoke test:

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/api/v1
curl http://127.0.0.1:8787/api/v1/challenges
```

## Environment variables

All values are non-sensitive; the service stores **no secrets**.

| Variable      | Default                  | Notes                                             |
| ------------- | ------------------------ | ------------------------------------------------- |
| `PORT`        | `8787`                   | 1–65535.                                          |
| `HOST`        | `127.0.0.1`              | Loopback by default; not reachable off-host.      |
| `CORS_ORIGIN` | `http://localhost:5173`  | Comma-separated allow-list. `*` is rejected.      |

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
deps (`fastify`, `@fastify/cors`) stay external and resolve from `node_modules`.

## Endpoint overview

| Method | Path                                | Status | Description                          |
| ------ | ----------------------------------- | ------ | ------------------------------------ |
| GET    | `/health`                           | 200    | Liveness + service metadata.         |
| GET    | `/api/v1`                           | 200    | API root descriptor.                 |
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

By design, this Phase 7 skeleton does **not** implement — and the service never
performs — any of the following:

- authentication, user accounts, sessions
- database, Redis, or any persistence
- environment provisioning, containers, sandboxes, or command execution
- flag validation or scoring (submissions are never marked "correct")
- outbound network requests, URL proxying, or SSRF primitives
- secrets of any kind

The API binds to `127.0.0.1` by default and uses an explicit, non-wildcard CORS
allow-list. See `docs/API.md` and `apps/lab/docs/LAB-BACKEND-ARCHITECTURE.md` for
the full contract and the phased roadmap.
