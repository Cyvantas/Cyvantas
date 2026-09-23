# CYVANTAS Security Lab API — Phase 7 Contract

This document describes the **Phase 7 API skeleton** (`apps/api`). It is the
concrete, implemented subset of the design in
[`apps/lab/docs/LAB-BACKEND-ARCHITECTURE.md`](../apps/lab/docs/LAB-BACKEND-ARCHITECTURE.md).

> **Scope.** Phase 7 implements read-only content endpoints and the shared
> response envelope only. Authentication, persistence, environment
> provisioning, sandboxing, flags, and scoring are **future phases** and are
> present here only as explicit `501 Not Implemented` stubs.

## Base

- Local base URL: `http://127.0.0.1:8787`
- Content routes are versioned under `/api/v1`.
- The API binds to loopback by default and uses a non-wildcard CORS allow-list.

## Response envelope

Success:

```json
{ "data": { } }
```

Error:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "status": 400 } }
```

- `code` is a stable, machine-readable string.
- Errors never contain stack traces or internal infrastructure details.

### Error codes

| Code                                  | HTTP | Meaning                                  |
| ------------------------------------- | ---- | ---------------------------------------- |
| `VALIDATION_ERROR`                    | 400  | Request failed schema validation.        |
| `BAD_REQUEST`                         | 4xx  | Malformed request (framework-level).     |
| `NOT_FOUND`                           | 404  | Unknown route.                           |
| `CHALLENGE_NOT_FOUND`                 | 404  | Unknown challenge slug.                  |
| `LEARNING_PATH_NOT_FOUND`             | 404  | Unknown learning-path slug.              |
| `MISSION_NOT_FOUND`                   | 404  | Unknown mission slug.                    |
| `ENVIRONMENT_SERVICE_NOT_IMPLEMENTED` | 501  | Environment provisioning (future phase). |
| `PROGRESS_SERVICE_NOT_IMPLEMENTED`    | 501  | Progress persistence (future phase).     |
| `FLAG_SERVICE_NOT_IMPLEMENTED`        | 501  | Flag validation (future phase).          |
| `INTERNAL_ERROR`                      | 500  | Unexpected server error (generic).       |

## Health

### `GET /health`

No authentication.

```json
{ "data": { "status": "ok", "service": "cyvantas-api", "version": "0.1.0" } }
```

## API root

### `GET /api/v1`

```json
{ "data": { "name": "CYVANTAS Security Lab API", "version": "v1", "status": "skeleton" } }
```

## Challenges

### `GET /api/v1/challenges`

Returns an array of public challenge metadata. **Only** these fields are exposed:

`slug`, `title`, `description`, `difficulty`, `points`, `category`,
`estimatedMinutes`, `tags`.

Never exposed: flags, answers, hints, objectives, internal ids, runtime status,
secrets, credentials, or environment internals.

### `GET /api/v1/challenges/:slug`

Returns one challenge (same public shape). Unknown slug → `404`
`CHALLENGE_NOT_FOUND`.

## Learning

### `GET /api/v1/learning`

Returns public learning-path summaries (`slug`, `title`, `shortDescription`,
`category`, `difficulty`, `estimatedMinutes`, `order`).

### `GET /api/v1/learning/:slug`

Returns one published path with public detail (description, objectives,
prerequisites, module/lesson outline, related challenge/tool slugs). No hidden
answers or future flags. Unknown slug → `404` `LEARNING_PATH_NOT_FOUND`.

## Missions

### `GET /api/v1/missions`

Returns public mission summaries.

### `GET /api/v1/missions/:slug`

Returns one published mission with public detail (briefing, objectives, stages,
related challenge/tool/learning slugs). No flags or answers. Unknown slug →
`404` `MISSION_NOT_FOUND`.

## Environments — contract stubs (not implemented)

All return `501` `ENVIRONMENT_SERVICE_NOT_IMPLEMENTED`. No environment is
provisioned, no id is minted, and no container is claimed to exist.

- `POST /api/v1/environments`
- `GET /api/v1/environments/:id`
- `POST /api/v1/environments/:id/start`
- `POST /api/v1/environments/:id/reset`
- `POST /api/v1/environments/:id/stop`

## Progress — stub (not implemented)

- `GET /api/v1/progress` → `501` `PROGRESS_SERVICE_NOT_IMPLEMENTED`

## Flags — stub (not implemented)

- `POST /api/v1/flags/submit` → `501` `FLAG_SERVICE_NOT_IMPLEMENTED`

No real flag exists in source, and no submission is ever validated or marked
"correct" in Phase 7.

## Security posture (Phase 7)

- Binds to `127.0.0.1` by default; not reachable off-host.
- Explicit, non-wildcard CORS allow-list (`CORS_ORIGIN`); `*` is rejected.
- No command execution, child processes, Docker/socket access, or outbound
  network requests.
- No client-provided scores trusted; no flags exposed; no fake environments.
- No secrets stored; no stack traces returned in error responses.

## Future phases

Authentication + database, environment service + lifecycle, sandbox
orchestration with approved digest-pinned images, isolated challenge
environments, server-authoritative flag validation and scoring, monitoring, and
abuse controls are **deferred** to later phases. See the backend architecture
document for the full roadmap.
