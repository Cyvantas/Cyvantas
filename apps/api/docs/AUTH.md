# CYVANTAS Security Lab API — Authentication & Database (Phase 8)

This document describes the authentication and database foundation. It covers
the data model, session/cookie design, CSRF strategy, password hashing, roles
and authorization, rate limiting, environment variables, and local setup.

> Scope note: Phase 8 delivers the backend foundation only. There is **no**
> sandbox/container execution, no real flag validation, and no frontend login
> UI. The Lab frontend remains backend-disabled until a later integration
> phase.

## Architecture overview

- **Framework:** Fastify 5 (the existing Phase 7 skeleton — not Express).
- **ORM / DB:** Prisma + PostgreSQL. Access is behind repository interfaces
  (`src/repositories/types.ts`) with two implementations:
  - **Prisma** (`src/repositories/prisma.ts`) — production path, used when
    `DATABASE_URL` is set.
  - **In-memory** (`src/repositories/memory.ts`) — development-without-a-DB and
    test path, used when `DATABASE_URL` is unset. Data is per-process and lost
    on restart. **Not** for production.
- **Auth service** (`src/services/authService.ts`) holds the security-sensitive
  logic; route handlers stay thin.
- **Guards** (`src/plugins/auth.ts`) derive authorization from the
  server-side session — never from client-supplied role data.

## Endpoints

All under `/api/v1/auth`.

| Method | Path        | Auth | Description |
| ------ | ----------- | ---- | ----------- |
| POST   | `/register` | no   | Create a user, assign the `USER` role, start a session. Returns a safe user DTO + sets the session cookie. `201`. |
| POST   | `/login`    | no   | Verify credentials, start a session, set the cookie. Returns the DTO. `200`. |
| POST   | `/logout`   | yes  | Revoke the current session and clear the cookie. `200`. |
| GET    | `/me`       | yes  | Return the current user's safe profile and roles. `200`. |

### Safe user DTO

```json
{ "id": "...", "email": "...", "displayName": "...", "roles": ["USER"] }
```

`passwordHash`, session tokens, timestamps and other internal fields are
**never** returned. Database models are mapped to DTOs at the boundary
(`src/domain/user.ts`).

## Sessions & cookies

- **Opaque tokens.** On login/register a 256-bit random token is generated. The
  client receives it **only** in an HttpOnly cookie. The database stores only a
  **SHA-256 hash** of the token (`sessions.tokenHash`), so a DB read cannot be
  replayed to forge a session.
- **Cookie attributes:** `HttpOnly`; `SameSite=Lax`; `Secure` in production
  (`NODE_ENV=production`); `Path=/`; `Max-Age = SESSION_TTL`.
- **No localStorage.** Tokens are never exposed to JS or returned in JSON.
- **Session record fields:** `id, userId, tokenHash, expiresAt, createdAt,
  lastSeenAt, revokedAt`. Indexed on `userId`, `expiresAt`, and unique
  `tokenHash`.
- **Rejection:** authentication rejects unknown, expired, and revoked sessions,
  and sessions for inactive users.
- **Revocation:** logout sets `revokedAt`. `revokeAllForUser` is available for
  global sign-out / role changes.
- **Cleanup:** `cleanupExpiredSessions()` (`src/services/sessionCleanup.ts`)
  deletes past-expiry rows. It is a plain function — no scheduler is included in
  Phase 8.

## Password hashing

- **Algorithm:** Argon2id via `hash-wasm` (pure WASM — no native build step,
  which matters on platforms lacking prebuilt native argon2 bindings).
- **Parameters:** memory ≈ 19 MiB, iterations = 3, parallelism = 1, 32-byte
  output, 16-byte random salt. Output is a self-describing PHC string.
- Plaintext passwords are never stored, logged, or returned. Verification is
  centralized in `src/security/password.ts`.

### Password policy

- Minimum length: **12**. Maximum length: **128** (bounds hashing cost /
  prevents resource-abuse). Empty passwords are rejected. Over-long input is
  **rejected, never silently truncated.** No arbitrary composition rules.
- Enforced at the boundary via Zod (`src/validation/authSchemas.ts`) and in the
  policy helper. Login does not re-assert the policy (avoids leaking it).

## Roles & authorization

- Roles: `USER`, `AUTHOR`, `ADMIN`, `SYSTEM` (normalized `Role` + `UserRole`
  join; a user may hold several).
- Authorization is always computed server-side from the authenticated session's
  user → roles. Client-supplied role data is never trusted.
- Reusable guards (preHandlers): `requireAuth`, `requireRole(role)`,
  `requireAnyRole([...])`. Unauthenticated → `401`; wrong role → `403`.
- New users are granted `USER` on registration. Elevated roles are assigned
  out-of-band (e.g. an admin tool in a later phase); a `ROLE_CHANGED` audit
  event is reserved for that.

## CSRF strategy

Cookie auth requires CSRF defence. Two layers:

1. **`SameSite=Lax` cookie** — blocks the common cross-site POST vector.
2. **Origin/Referer allow-list** on state-changing (POST) auth requests
   (`src/security/csrf.ts`). The request's `Origin` (or `Referer` origin
   fallback) must be in the configured `CORS_ORIGIN` allow-list; foreign
   origins get `403 CSRF_ORIGIN_REJECTED`. A browser cannot forge `Origin`
   cross-site, so this defeats classic CSRF without a synchronizer-token
   round-trip. Requests with neither header (same-origin non-browser clients)
   pass, with SameSite as the browser backstop.

## Rate limiting

- In-memory fixed-window limiter (`src/security/rateLimiter.ts`). Auth limits
  are stricter than the general API:
  - login: 10 / 15 min per `IP+email`
  - register: 5 / hour per IP
  - authApi: 120 / min (general baseline)
- Exceeding a limit → `429 RATE_LIMITED`.
- **Limitation:** counters are per-process and **not** horizontally scalable.
  A multi-instance production deployment must back this with a shared store
  (e.g. Redis). The interface (`RateLimiter`) is designed so a shared-store
  implementation can replace it without touching callers. Redis is intentionally
  **not** introduced in Phase 8.

## Error handling

Preserves the Phase 7 envelope: `{ "error": { "code", "message", "status" } }`.
No stack traces, SQL, DB errors, or token/password internals are exposed.

- Login failures are generic: `401 INVALID_CREDENTIALS` — *"Invalid email or
  password."* — identical for wrong password and unknown email (no user
  enumeration). A dummy Argon2 verify runs for unknown emails to equalize
  response timing.
- Duplicate registration is non-specific: `409 EMAIL_UNAVAILABLE` — *"Unable to
  register with the provided details."* (avoids confirming which emails exist).
- Validation failures: `400 VALIDATION_ERROR` (no field internals echoed).

## Audit log

Security-sensitive events are recorded server-side in `audit_logs`:
`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `REGISTER`, `SESSION_REVOKED`,
`ROLE_CHANGED`. Records store event, optional `userId`, IP, and user-agent —
never passwords or session tokens. (The in-memory implementation is a no-op;
the Prisma implementation persists.)

## Environment variables

| Variable              | Required | Default        | Notes |
| --------------------- | -------- | -------------- | ----- |
| `NODE_ENV`            | no       | `development`  | `production` requires `DATABASE_URL` and enables `Secure` cookies. |
| `PORT`                | no       | `8787`         | |
| `HOST`                | no       | `127.0.0.1`    | Loopback by default. |
| `CORS_ORIGIN`         | no       | `http://localhost:5173` | Comma-separated; `*` is rejected. Also the CSRF allow-list. |
| `DATABASE_URL`        | prod     | *(unset → in-memory)* | PostgreSQL connection string. |
| `SESSION_COOKIE_NAME` | no       | `cyv_session`  | |
| `SESSION_TTL`         | no       | `604800` (7d)  | Seconds, range 60..7776000. |

Config is validated at startup (`src/config/env.ts`); invalid values throw.

## Local development

PostgreSQL is **not** assumed to be installed. You have two options:

### Option A — in-memory (no database)

Leave `DATABASE_URL` unset. Auth, sessions, and progress run against the
in-memory store. Good for running the API and tests locally with zero setup.

```bash
npm install
cp .env.example .env      # ensure DATABASE_URL is commented/unset
npx prisma generate       # generates the Prisma client types (used by the build)
npm run dev
```

### Option B — real PostgreSQL (production-like)

Requires a reachable PostgreSQL instance. Set `DATABASE_URL` in `.env`, then:

```bash
npm install
cp .env.example .env      # set a real DATABASE_URL
npx prisma generate
npx prisma migrate dev    # applies prisma/migrations to your database
npm run dev
```

Useful commands:

- `npx prisma migrate dev` — create/apply migrations in development.
- `npx prisma migrate reset` — drop and re-apply all migrations (destroys data).
- `npx prisma studio` — inspect data (where supported).

### Test database strategy

Tests use the **in-memory repositories** and require **no** database or
credentials (`npm test`). Auth, session-lifecycle, authorization, rate-limit,
and no-leak security assertions all run without PostgreSQL. Integration testing
against a real Postgres can be added later by pointing `DATABASE_URL` at a
disposable test database and swapping in the Prisma repositories.

### Platform note (build host)

This repository's build host is aarch64 **Android/Termux**. Prisma's native
**query/schema-engine binaries do not run there** (no glibc), and PostgreSQL is
not installed. Consequences:

- `prisma generate` works (WASM schema parsing) — so `tsc`/build and types are
  fine, and the in-memory path runs.
- `prisma migrate dev` / live queries require a **Prisma-supported host** with
  PostgreSQL. The initial migration in `prisma/migrations/` was therefore
  hand-authored to match `schema.prisma` (see the note atop that SQL file) and
  applies cleanly on a supported host.
