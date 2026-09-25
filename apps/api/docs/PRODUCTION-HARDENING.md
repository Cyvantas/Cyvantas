# Production Hardening (Phase 14)

This is the pre-production security checklist and the operational reference for
deploying the CYVANTAS Security Lab API. It complements the per-phase docs
(`AUTH.md`, `ENVIRONMENTS.md`, `SANDBOX.md`, `SCORING.md`, `CHALLENGES.md`,
`MONITORING.md`, `ABUSE-CONTROLS.md`) and does not restate them.

Guiding principles, unchanged from earlier phases: **server-authoritative
decisions, session-derived actor identity, default-deny sandbox, least
privilege, defense in depth, fail-closed controls, no sensitive leakage.** The
API today contains **no** code path that provisions a container, opens a
socket, spawns a process, or makes an outbound network call; the runtime is the
`notConfiguredRuntimeProvider` seam and `runtimeStatus` is always
`NOT_PROVISIONED`. Regression tests scan the source to keep it that way.

## Security posture summary

- Sessions are opaque 32-byte tokens, SHA-256 hashed at rest, delivered ONLY as
  an HttpOnly cookie (Secure in production, SameSite=Lax). The raw token is
  never in a JSON body and never logged.
- Passwords use Argon2id (hash-wasm, m=19456 KiB, t=3, p=1); min length 12,
  max 128 (rejected, never truncated).
- CSRF: SameSite=Lax + an Origin/Referer allow-list on every state-changing
  route.
- Authorization is always derived from the server-side session; no route trusts
  a `userId` from the body or query. Not-owned resources return 404 (no
  existence disclosure), ADMIN sees all.
- Rate limits are layered (per-user + per-IP ceiling) and FAIL-CLOSED; denials
  return a uniform 429 with no limit details.
- Security events are structured, correlation-id tagged, and redaction-scrubbed
  before any sink; flags/passwords/tokens can never reach a log line.
- Scoring is an append-only ledger with a unique `(userId, challengeSlug,
  reason)` constraint (score-once); points come only from the catalog.

## HTTP hardening (added in Phase 14)

Every response — success, error envelope, and 404 — carries these headers, set
on the first `onRequest` hook alongside the correlation id:

| Header | Value | Why |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | The API serves JSON only; block MIME sniffing. |
| `X-Frame-Options` | `DENY` | The API is never framed. |
| `Referrer-Policy` | `no-referrer` | No referrer leakage from API responses. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Block cross-origin embedding of responses. |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Null-by-default policy for a pure JSON API. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Production only (TLS-terminated); omitted in dev to avoid poisoning local http. |

The inbound `X-Request-Id` is honored only when it matches
`/^[A-Za-z0-9._-]{1,200}$/`; anything else (control characters, header-splitting
bytes, over-length) is discarded and a fresh UUID is minted.

`bodyLimit` is 256 KiB. CORS is explicit (never `*`), credentialed, and limited
to GET/POST/DELETE.

## Config fail-closed (added in Phase 14)

`loadConfig` refuses to boot on unsafe production configuration:

- `DATABASE_URL` is required in production (no silent in-memory fallback).
- `CORS_ORIGIN` is required in production, every entry must be an absolute
  `https://` URL, and loopback hosts are rejected.
- Wildcard CORS (`*`) is rejected in any environment.
- `cookieSecure` is `true` iff `NODE_ENV=production`.

## Pre-production checklist

### Configuration & secrets
- [ ] `NODE_ENV=production` on all API instances.
- [ ] `DATABASE_URL` set to a production PostgreSQL instance (TLS enforced).
- [ ] `CORS_ORIGIN` set to the exact https lab/main origins (no trailing
      wildcard, no localhost).
- [ ] `SESSION_TTL` reviewed for the deployment (default 7 days).
- [ ] No secrets in the repo, image, or `.env.example`; secrets injected only
      via the platform secret manager / env at runtime.
- [ ] `SECURITY_EVENT_LOG=true` and the stdout stream is shipped to the log sink.

### Authentication
- [ ] Cookies observed as `Secure; HttpOnly; SameSite=Lax` in production.
- [ ] Argon2id parameters unchanged (m=19456, t=3, p=1) or deliberately raised.
- [ ] Login returns the generic `INVALID_CREDENTIALS` for both bad email and bad
      password (no user enumeration); register returns generic
      `EMAIL_UNAVAILABLE`.
- [ ] Logout revokes the session server-side and clears the cookie.

### Authorization / IDOR
- [ ] Every mutating route runs `requireAuth` and derives the actor from the
      session (`actorFrom(request)`), never from the body/query.
- [ ] Not-owned / nonexistent resources return 404, ADMIN sees all.
- [ ] Trusted-origin check on all state-changing routes.

### Sandbox (architecture only — nothing is provisioned)
- [ ] Runtime is the `notConfiguredRuntimeProvider`; `runtimeConfigured=false`.
- [ ] Policy engine defaults are deny-ingress / deny-egress, all dangerous
      capabilities false, read-only root FS.
- [ ] SSRF blocklist (`classifyDestination`) rejects loopback, link-local,
      private, CGNAT, cloud metadata, unix-socket, wildcard, internal-TLD.
- [ ] `resolveSandboxPolicy` REJECTS out-of-range requests (never clamps).
- [ ] Before any real runtime is wired: re-run the sandbox review, add real
      Docker-socket / host-FS / capability tests, and gate behind an explicit
      opt-in flag.

### Challenge / flag / scoring
- [ ] Flags live only inside verifier closures; public DTOs strip
      hints/ids/status/flags.
- [ ] Submit accepts `{environmentId, answer}` only; client-supplied points are
      ignored.
- [ ] Scoring is append-only with the `(userId, challengeSlug, reason)` unique
      constraint (score-once verified under concurrent submit).

### Monitoring & abuse
- [ ] Correlation id present on every response and error envelope.
- [ ] Redaction verified: no flag/password/token in any emitted event.
- [ ] Rate limits fail-closed; 429 leaks no limit/scope detail to the client.
- [ ] **Multi-instance:** the in-memory rate limiter and detection tracker are
      per-process. Behind >1 instance, move both to a shared store (Redis)
      before relying on the limits as global.

### Database
- [ ] Migrations applied via `prisma migrate deploy` (never `db push` /
      `migrate dev` in production).
- [ ] No destructive migration in the deploy path without a reviewed backup +
      rollback plan.
- [ ] Connection pool sized for the instance count; TLS to PostgreSQL enforced.

### Build & supply chain
- [ ] `npm run build` (tsc --noEmit && tsup) is clean.
- [ ] `npm run lint` is clean.
- [ ] `npm audit --omit=dev` reports 0 vulnerabilities (dev-only advisories are
      acceptable and documented below).
- [ ] Production image installs with `--omit=dev`; no tsx/vitest/tsup at
      runtime.

### Deployment & recovery
- [ ] Liveness probe wired to `GET /health`.
- [ ] Readiness gate performs a DB round-trip before adding an instance to the
      pool (see Deployment architecture below).
- [ ] Backups scheduled and a restore has been rehearsed (see Disaster
      recovery).
- [ ] Secret-rotation and mass-session-invalidation procedures documented and
      access-controlled.

## Deployment architecture (documentation only)

```
            ┌─────────────┐        ┌─────────────┐
  users ──▶ │  main site  │        │ lab frontend │  (static, CDN/edge)
            │ cyvantas.in │        │lab.cyvantas.in│
            └─────────────┘        └──────┬───────┘
                                          │ https, credentialed fetch
                                          ▼
                                   ┌──────────────┐
                                   │   API (this) │  N stateless instances
                                   │  Fastify 5   │  behind a TLS load balancer
                                   └──┬────────┬──┘
                                      │        │
                        ┌─────────────┘        └──────────────┐
                        ▼                                      ▼
                 ┌────────────┐                        ┌──────────────┐
                 │ PostgreSQL │                        │ Redis (future)│
                 │  primary   │                        │ rate limit +  │
                 │ + replica  │                        │ detection +   │
                 └────────────┘                        │ sessions      │
                                                        └──────────────┘

  (future, out of scope now) sandbox control-plane + isolated worker nodes,
  reached ONLY through the runtime-provider seam — never from the API process.
```

Trust / network boundaries:
- The frontends are untrusted; the API treats every request as hostile input
  (zod validation at the boundary, server-authoritative everything else).
- TLS terminates at the load balancer; the API sets HSTS in production and marks
  cookies Secure.
- Only the API talks to PostgreSQL; the DB is not internet-reachable.
- Secrets are injected at runtime from the platform secret manager; they never
  reach the frontends or the client bundle.
- The (future) sandbox control-plane is a separate trust zone reached solely via
  the injected runtime seam, so a compromise of a worker cannot call back into
  the API's data plane.

Liveness vs readiness:
- **Liveness:** `GET /health` (no auth, no dependencies) — restart the instance
  if it stops answering.
- **Readiness:** add a DB-round-trip readiness endpoint when wiring the real
  Postgres deployment; an instance should not receive traffic until its DB
  connection is healthy. Not built now because the in-memory dev store has no
  meaningful readiness signal and a fake probe would violate the
  no-fake-functionality principle.

Rolling deployment:
- Instances are stateless (sessions live in PostgreSQL, not memory). Roll one at
  a time behind the readiness gate. Because rate-limit/detection state is
  per-process today, expect limits to be per-instance until Redis is introduced.

## Disaster recovery (documentation only)

- **Backups:** scheduled PostgreSQL base backups + WAL archiving (PITR). Retain
  per the data-retention policy; store off the primary host.
- **Restore rehearsal:** restore into a scratch instance on a schedule and run
  the test suite against it; an untested backup is not a backup.
- **Migration rollback:** migrations are forward-only via
  `prisma migrate deploy`. To roll back, restore from the pre-migration backup
  (or apply a compensating forward migration) — never hand-edit
  `_prisma_migrations`.
- **Secret rotation:** rotate `DATABASE_URL` credentials and any future signing
  secrets via the secret manager, then roll instances. Session tokens are opaque
  and DB-backed, so rotating app secrets does not require re-issuing them.
- **Mass session invalidation:** revoke all sessions by setting `revokedAt` (or
  truncating the `Session` table) — every request re-validates against the store
  on the next call.
- **Sandbox cleanup after control-plane failure (future):** when a real runtime
  is wired, orphaned workers must be reaped by a reconciler keyed on the
  environment lifecycle records (the API already tracks
  REQUESTED→…→DESTROYED with TTL + absolute-lifetime caps), so a control-plane
  crash cannot leave workers running past their cap.
- **Incident recovery:** correlate via `X-Request-Id` across the client report,
  the error envelope, and the structured security events; contain (rotate
  secrets / invalidate sessions / tighten limits), then restore from a known-good
  backup if data integrity is in question.

## Known limitations (development environment)

- **Termux / aarch64 (Android):** the Prisma query engine binary is not
  available, so the API is developed against the in-memory repository and the
  Prisma delegates are loose-cast. Prisma must be validated on a supported
  x86_64/arm64 Linux host before production; do not treat the in-memory store as
  a production backend.
- **Single-process abuse controls:** the rate limiter and detection tracker are
  in-memory and per-process. They are correct for a single instance only; a
  shared store (Redis) is required for multi-instance enforcement.
- **No real sandbox runtime:** by design, nothing is provisioned. Wiring a real
  runtime is a future phase and requires its own security review.
- **Dev-only dependency advisories:** `npm audit` reports esbuild (Windows
  dev-server file-read) and vitest/@vitest/mocker advisories. These are
  devDependencies only; `npm audit --omit=dev` reports 0 vulnerabilities, so the
  production install is unaffected.
