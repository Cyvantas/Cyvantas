# Challenges (Phase 11)

The challenge subsystem adds the first **isolated educational security
challenge** (`reflected-xss`) plus **server-authoritative flag submission**. It
reuses the Phase 9 environment control-plane and the Phase 10 runtime-provider
seam — it introduces **no** second runtime abstraction and has **no** execution
capability of its own.

```
route → challengeService (challenge binding · flag verify · audit · progress)
        → environmentService (ownership · limits · TTL · state machine)
        → EnvironmentRuntimeProvider  (the ONLY I/O seam)
```

> **Phase 11 provisions NO real container, process, or vulnerable target.** The
> vulnerability lives ONLY inside a future challenge runtime, never in the
> CYVANTAS API or main site. In this build the wired provider is
> `notConfiguredRuntimeProvider`, so a challenge environment stays `REQUESTED`
> and honestly reports `runtimeConfigured=false` / `serviceUrl=null`. It is
> never faked into a `READY`/`ACTIVE` state.

## Trust model

Everything a client sends is untrusted. The following are hard guarantees:

- **The real flag never leaves the server.** It is not in any catalog/detail
  response, environment view, HTML, JS bundle, DTO, or audit log. It lives only
  inside a verifier closure (`src/challenges/verifier.ts`).
- **The client never defines correctness.** Submission returns only
  server-decided fields (`correct`, `alreadySolved`, `pointsAwarded`,
  `totalPoints`) — never the answer, a partial-match signal, or a reason. Points
  come from the authoritative catalog, never the request body (see
  [SCORING.md](./SCORING.md)).
- **The actor is derived from the session, never from the body.** A
  client-supplied `userId` is ignored; ownership is enforced by
  `environmentService` (404, not 403, for a non-owned id).
- **No execution primitives.** The challenge source imports no
  `child_process`/`net`/`tls`/`dgram`/`fs`/Docker/K8s module and contains no
  `exec`/`spawn`/`fork`/`fetch`/docker-socket call site. Enforced by
  `tests/challengeSecurity.test.ts` (source scan + behavioral proof).

## Flag verification

`createStaticFlagVerifier(flag)` holds the flag in a closure and compares in
time proportional to the **expected** length (`timingSafeEqual`), so a caller
cannot learn the flag — or how many leading bytes matched — through timing. A
length mismatch still walks the full expected length. `verify` returns `false`
(never throws) for a wrong or malformed answer.

The flag is read from `CHALLENGE_REFLECTED_XSS_FLAG` when set; otherwise a
deterministic educational default is used so local/test runs are reproducible.
The default is **not** a secret and is never sent to a browser.

### Future work — environment-side evidence

The current verifier is a deterministic static-flag check. A future verifier
will inspect **evidence collected by the runtime** (e.g. a callback the injected
XSS payload triggers inside the isolated instance), binding correctness to the
specific environment rather than a shared static string. The
`ChallengeVerificationContext` already carries the owning `environment`, so this
change requires no contract change for consumers.

## HTTP surface

All routes are under `/api/v1/challenges`. Mutating routes require an
authenticated session, enforce a trusted origin (CSRF), and are rate-limited
per user.

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET | `/` | no | Public challenge list (whitelisted fields). |
| GET | `/:slug` | no | Challenge detail (adds safe `objectives`). |
| POST | `/:slug/environments` | yes | Create a challenge environment (201). |
| GET | `/:slug/environments/:environmentId` | yes | Owned environment view. |
| POST | `/:slug/environments/:environmentId/reset` | yes | Reset an environment. |
| POST | `/:slug/submit` | yes | Submit `{ environmentId, answer }` → server-decided scoring outcome. |

Rate rules (`src/security/rateLimiter.ts`): `challengeEnvironmentCreate`
(20/min), `challengeEnvironmentReset` (30/min), `challengeSubmit` (15/min).

### Error codes

- `CHALLENGE_NOT_FOUND` (404) — unknown slug (not in registry or catalog).
- `ENVIRONMENT_NOT_FOUND` (404) — unknown or non-owned environment (IDOR-safe).
- `ENVIRONMENT_CHALLENGE_MISMATCH` (400) — environment belongs to a different
  challenge/type than the one in the path.
- `INVALID_SUBMISSION` (400) — empty/oversized answer or missing environmentId.
- `ENVIRONMENT_INVALID_STATE` (409) — environment destroyed/destroying/failed.
- `ENVIRONMENT_EXPIRED` (409) — environment past its expiry.
- `RATE_LIMITED` (429) — per-user window exhausted.
- `CSRF_ORIGIN_REJECTED` (403) — untrusted request origin.

## Safe view

`ChallengeEnvironmentView` exposes only: `environmentId`, `challengeSlug`,
`status`, `runtimeStatus`, `runtimeConfigured`, `createdAt`, `expiresAt`,
`lastActivityAt`, `serviceUrl` (always `null` in this build), and — only when
`FAILED` — a stable `failureCode`. It never carries `userId`, metadata, failure
messages, host ids/paths/addresses, or the flag.

## Audit events

`CHALLENGE_ENVIRONMENT_REQUESTED`, `CHALLENGE_ENVIRONMENT_READY`,
`CHALLENGE_ENVIRONMENT_FAILED`, `CHALLENGE_ENVIRONMENT_RESET`,
`CHALLENGE_ENVIRONMENT_DESTROYED`, `CHALLENGE_SUBMISSION_ACCEPTED`,
`CHALLENGE_SUBMISSION_REJECTED`, `CHALLENGE_SCORE_AWARDED` (first solve only).
Flags, tokens, and passwords are never logged.

## Progress & scoring

A correct submission is recorded **server-authoritatively and idempotently**:
every submission counts an attempt, and the first correct solve records
completion and awards catalog points **exactly once** via an append-only
`ScoreEvent` ledger. The safe read API is `GET /api/v1/progress`. See
[SCORING.md](./SCORING.md) for the full trust model, the once-only guarantee,
and the DTOs.

## Database

No new table or column. Challenge environments reuse the `environments` table
(`type = CHALLENGE`). The migration
`prisma/migrations/20260924200000_challenge_audit_events` only extends the
`AuditEvent` enum with the seven challenge events, idempotently guarded with
`ADD VALUE IF NOT EXISTS`. On this Termux/aarch64 build the Prisma schema-engine
cannot run, so the SQL is hand-authored to match `schema.prisma`; regenerate
with `prisma migrate dev` on a Prisma-supported host.

## Not in this phase

Leaderboards, badges, production Docker/containers, a real running target,
multiple isolated challenges, and environment-side evidence verification. Those
are Phase 13+.
