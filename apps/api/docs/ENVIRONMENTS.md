# Environments (Phase 9)

The environment service manages the **lifecycle records** for per-user training
environments tied to a Lab challenge or mission. Phase 9 is deliberately a
**control plane only**: it persists state, enforces authorization/limits/TTL,
and drives a state machine — but it provisions **no** sandbox, container, or
process. A future phase (10) attaches a real runtime behind the same interface
without changing the service or routes.

> **Honesty guarantee.** No route ever claims a runtime is running. The runtime
> provider wired in Phase 9 is `notConfiguredRuntimeProvider`, so every
> environment reports `runtimeStatus: NOT_PROVISIONED` and every DTO reports
> `runtimeConfigured: false`.

## Data model

An `Environment` belongs to a `User` and targets exactly one catalog item —
either a `challengeSlug` **or** a `missionSlug` (never both, never neither),
validated against the Lab catalog at creation time.

| Field | Meaning |
| ----- | ------- |
| `id` | UUID primary key. |
| `userId` | Owner. Never exposed in the DTO. |
| `type` | `CHALLENGE` or `MISSION`. |
| `challengeSlug` / `missionSlug` | The single target; the other is null. |
| `status` | Lifecycle status (control plane) — see below. |
| `runtimeStatus` | Data-plane status. Always `NOT_PROVISIONED` in Phase 9. |
| `requestedAt` / `provisioningStartedAt` / `readyAt` / `startedAt` | Lifecycle timestamps. |
| `lastActivityAt` | Last activity; drives the sliding TTL. |
| `expiresAt` | When the sliding TTL lapses. Server-authoritative. |
| `timeoutAt` / `destroyedAt` | Set on TIMEOUT / DESTROYED. |
| `failureCode` / `failureMessage` | Set on FAILED. Only the *code* is exposed. |
| `metadata` | Reserved internal JSON. Never exposed. |

`status` (control plane) is intentionally **separate** from `runtimeStatus`
(data plane) so a future sandbox's health is decoupled from the record's
lifecycle.

## Lifecycle status

```
REQUESTED    → PROVISIONING | TIMEOUT | DESTROYING | FAILED
PROVISIONING → READY | TIMEOUT | DESTROYING | FAILED
READY        → ACTIVE | RESETTING | TIMEOUT | DESTROYING | FAILED
ACTIVE       → READY | TIMEOUT | RESETTING | DESTROYING | FAILED
TIMEOUT      → RESETTING | DESTROYING | FAILED
RESETTING    → READY | ACTIVE | TIMEOUT | DESTROYING | FAILED
DESTROYING   → DESTROYED | FAILED
FAILED       → DESTROYING | DESTROYED
DESTROYED    → (terminal)
```

Transitions are enforced by a dedicated state machine
(`src/domain/environmentStateMachine.ts`). Any illegal transition throws
`INVALID_ENVIRONMENT_TRANSITION`; the service maps operation-level violations to
the `ENVIRONMENT_INVALID_STATE` API error. `DESTROYED` is terminal.

Notes:
- **`ACTIVE → READY`** models a **stop** (runtime stopped, record retained and
  re-startable). This augments the illustrative list in the brief so `/stop`
  has a coherent target.
- **Every live status can reach `TIMEOUT`** so the TTL sweeper can expire an
  idle environment regardless of how far it progressed.

**Live statuses** (hold a slot, count toward `MAX_ACTIVE`): `REQUESTED`,
`PROVISIONING`, `READY`, `ACTIVE`, `RESETTING`.

## Endpoints

All endpoints require an authenticated session. The actor (id + roles) is
derived **server-side** from the session cookie — never from the request body —
so a client cannot act on another user's environments or spoof ownership.
Mutating routes additionally enforce a trusted `Origin` (CSRF defense).

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/v1/environments` | Create. Body `{ type, challengeSlug?, missionSlug? }`. Honors `Idempotency-Key`. Returns `201`. |
| `GET` | `/api/v1/environments` | List the caller's environments. |
| `GET` | `/api/v1/environments/:id` | Fetch one owned environment. |
| `POST` | `/api/v1/environments/:id/start` | Advance toward `ACTIVE`. Idempotent when already `ACTIVE`. |
| `POST` | `/api/v1/environments/:id/touch` | Slide the TTL forward (capped by lifetime). |
| `POST` | `/api/v1/environments/:id/reset` | Reset back to `READY`. |
| `POST` | `/api/v1/environments/:id/stop` | Stop `ACTIVE → READY`. Idempotent when already `READY`. |
| `DELETE` | `/api/v1/environments/:id` | Destroy. Terminal and idempotent. |

### Safe DTO

Responses use `EnvironmentDTO`, which exposes only: `id`, `type`,
`challengeSlug`, `missionSlug`, `status`, `runtimeStatus`, `runtimeConfigured`,
`createdAt`, `expiresAt`, `lastActivityAt`, and `failureCode` (only when
`FAILED`). It **never** includes `userId`, `metadata`, `failureMessage`, or any
runtime/provider internals or stack traces.

## Ownership & IDOR

`getEnvironment` and every mutating operation load through `loadOwned`, which
returns **`404 ENVIRONMENT_NOT_FOUND`** both when the id does not exist and when
it belongs to another (non-admin) user. Returning 404 rather than 403 avoids
disclosing that a given id exists to a user who may not see it. Admins may read
any environment.

## Limits

Per user, server-authoritative (configurable via env):

- `MAX_ACTIVE_ENVIRONMENTS` (default 3): concurrently-live environments.
- `MAX_TOTAL_ENVIRONMENTS` (default 25): retained (non-`DESTROYED`) environments.

Exceeding either yields `409 ENVIRONMENT_LIMIT_REACHED`. Destroying an
environment frees both a live and a total slot.

## TTL

`expiresAt` is a **sliding idle window** of `ENVIRONMENT_TTL_MINUTES` (default
60), refreshed by activation, reset, and `/touch`. It is always clamped to an
**absolute cap** of `createdAt + MAX_ENVIRONMENT_LIFETIME_MINUTES` (default 240)
that a client can **never** extend past. Operating on an expired environment
yields `409 ENVIRONMENT_EXPIRED`. `cleanupExpiredEnvironments(before?)` sweeps
live, past-expiry environments to `TIMEOUT` (invoked on demand — there is no
scheduler in Phase 9).

## Idempotency

- **Creation** is de-duplicated with an `Idempotency-Key` header, backed by a
  per-process, per-user, best-effort store (24h TTL). A repeated key returns the
  originally created environment instead of minting a second. Not shared across
  replicas — a production multi-instance deployment must back this with a shared
  store or a DB uniqueness constraint.
- **Lifecycle** operations are made idempotent by the state machine itself:
  `start` on an already-`ACTIVE` env, `stop` on an already-`READY` env, and
  `destroy` on an already-`DESTROYED` env are safe no-ops.

## Auditing

Lifecycle actions record structured audit events (via the audit repository):
`ENVIRONMENT_CREATED`, `ENVIRONMENT_START_REQUESTED`, `ENVIRONMENT_READY`,
`ENVIRONMENT_ACTIVATED`, `ENVIRONMENT_RESET_REQUESTED`,
`ENVIRONMENT_STOP_REQUESTED`, `ENVIRONMENT_DESTROY_REQUESTED`,
`ENVIRONMENT_DESTROYED`, `ENVIRONMENT_TIMEOUT`, `ENVIRONMENT_FAILED`.

## Error codes

| Code | Status | When |
| ---- | ------ | ---- |
| `VALIDATION_ERROR` | 400 | Malformed request body. |
| `INVALID_ENVIRONMENT_TARGET` | 400 | Missing/mixed target, or unknown/unsupported catalog slug. |
| `ENVIRONMENT_NOT_FOUND` | 404 | Unknown id, or owned by another non-admin user. |
| `ENVIRONMENT_LIMIT_REACHED` | 409 | Per-user active/total limit exceeded. |
| `ENVIRONMENT_INVALID_STATE` | 409 | Operation not allowed from the current status. |
| `ENVIRONMENT_EXPIRED` | 409 | Operating on an environment past its TTL. |
| `UNAUTHENTICATED` | 401 | No valid session. |
| `CSRF_ORIGIN_REJECTED` | 403 | Mutating request from an untrusted origin. |

## Runtime provider seam (Phase 10)

`EnvironmentRuntimeProvider` (`src/services/runtime/`) is the single seam a real
runtime will implement (`provision`/`start`/`stop`/`reset`/`destroy`/`status`),
returning a structured `RuntimeResult`. Phase 9 wires
`notConfiguredRuntimeProvider`, whose every method returns
`{ ok: false, runtimeStatus: "NOT_PROVISIONED", code: "RUNTIME_NOT_CONFIGURED" }`.
Phase 10 will drop in a real provider **without** changing the service or the
routes. Do not add Docker/Kubernetes/exec logic before then.

## Prisma / Termux note

The `Environment` model and the extended `AuditEvent` enum ship as a
hand-authored SQL migration
(`prisma/migrations/20260924160000_environments/migration.sql`) because the
aarch64 Android/Termux build host cannot run Prisma's engine to `migrate dev`.
The Prisma repository accesses the `environment` delegate through a loose cast
for the same reason, so type-checking and the build succeed without
regenerating the client. Apply the migration on a Prisma-supported host.
