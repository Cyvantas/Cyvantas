# Production Infrastructure (Phase 15)

This document is the **provider-neutral** deployment contract for the CYVANTAS
Security Lab API. It states what infrastructure the API needs, how liveness and
readiness differ, how migrations and secrets are handled, and the exact
prerequisites before a real launch. It complements — and does not restate —
`PRODUCTION-HARDENING.md` (security posture, HTTP hardening, checklist) and the
per-feature docs (`AUTH.md`, `ENVIRONMENTS.md`, `SANDBOX.md`, `SCORING.md`,
`CHALLENGES.md`, `MONITORING.md`, `ABUSE-CONTROLS.md`).

> **Nothing here has been deployed or provisioned.** No cloud resources, no DNS
> changes, no PostgreSQL, no Redis, no containers. This is readiness-of-code and
> a runbook — not an executed deployment. **No provider has been selected.**

## 1. Architecture

```
                    Internet
                       │
                       ▼
              HTTPS / edge (TLS terminates here)
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼                ▼
   main frontend   lab frontend      API (this service)
   cyvantas.in     lab.cyvantas.in   N stateless instances
   (static/CDN)    (static/CDN)      behind a TLS load balancer
                                        │
                          ┌─────────────┴──────────────┐
                          ▼                            ▼
                    ┌────────────┐            ┌───────────────────┐
                    │ PostgreSQL │            │ Redis-compatible   │
                    │ (primary   │            │ shared state       │
                    │ + replica) │            │ (rate limit /      │
                    └────────────┘            │  detection)        │
                                              └───────────────────┘
                                        │
                                        ▼
                          future sandbox control plane
                          (out of scope — not provisioned)
```

- The frontends are **untrusted**; the API validates every request at the
  boundary and derives all authority server-side.
- Only the API talks to PostgreSQL and Redis; neither is internet-reachable.
- The sandbox control plane **does not exist yet** and is reached only through
  the injected runtime-provider seam when it is built and separately reviewed.

## 2. Required infrastructure

| Component | Required? | Purpose |
| --- | --- | --- |
| HTTPS edge / load balancer | Yes | TLS termination, health/readiness probing, fan-out to instances. |
| API instances (this service) | Yes | Stateless Fastify app; scale horizontally. |
| PostgreSQL | Yes | Durable store for users, sessions, progress, scoring, environments. |
| Redis-compatible store | Multi-instance only | Shared rate-limit / detection counters. Single instance may omit. |
| Secret manager | Yes | Injects `DATABASE_URL`, `REDIS_URL`, and future secrets at runtime. |
| Log sink | Recommended | Collects the API's stdout JSON security events. |
| Sandbox control plane | Not yet | Deferred; requires its own isolation infra + security review. |

## 3. PostgreSQL requirements

- A managed or self-hosted PostgreSQL reachable only from the API network.
- TLS enforced on the connection (`sslmode=require` or provider equivalent).
- Connection pool sized for the instance/replica count.
- The schema is authoritative in `prisma/schema.prisma`. It is applied ONLY via
  `prisma migrate deploy` (see §6) — never from application startup or an HTTP
  request.
- A primary is required; a read replica is optional and not used by the app
  today (all queries hit the primary).

## 4. Redis requirements

The rate limiter and abuse-detection counters read and write their state
through a `SharedStateStore` (`src/security/rateLimiter.ts`,
`src/monitoring/detection.ts`). They hold no state of their own, so the store
implementation decides whether limits are per-process or global.

- **Single instance:** the default in-memory store is correct and sufficient.
  No Redis needed.
- **Multi-instance:** an in-memory store would keep per-replica counters, so a
  global limit would NOT be enforced across instances. A **Redis-compatible
  shared store is required** for the limits to be global.

`src/infra/sharedState.ts` defines the provider-neutral `SharedStateStore`
interface (`get`/`set`/`increment`/`expire`/`delete`/`ping`) and ships an
in-memory implementation as the default. `src/infra/redisSharedStateStore.ts`
adapts that interface onto any Redis-compatible client via an injected
`RedisLikeClient` (atomic `SET … EX` on write, `INCRBY`/`EXPIRE` for windowed
counters, bounded fail-closed `ping()`). This repo installs **no** Redis client
package and assumes **no** provider: a deployment injects a concrete client
(e.g. `ioredis`/`redis`) that satisfies `RedisLikeClient`. Setting `REDIS_URL`
validates the URL and records intent; the deployment is responsible for
constructing the client from it and passing the Redis-backed store to the app.

> **Honesty note:** the API is horizontally scalable *for the rate limits* once
> a Redis-backed `SharedStateStore` is injected (the adapter is now shipped;
> only the concrete client construction is deployment-supplied). Sessions and
> all durable state already live in PostgreSQL, so instances are otherwise
> stateless and safe to scale.

## 5. Health vs readiness

Two distinct probes, wired as separate endpoints. Neither requires auth.

| | `GET /health` (liveness) | `GET /ready` (readiness) |
| --- | --- | --- |
| Question | "Is the process alive?" | "Should this instance take traffic?" |
| Dependencies | **None** — never touches PostgreSQL or Redis. | Probes DB + shared state. |
| On failure | Orchestrator **restarts** the instance. | LB **removes** the instance from rotation. |
| Success body | `{ "data": { "status": "ok", "service", "version" } }` | `{ "data": { "status": "ready", "checks": { "database": "ok", "sharedState": "ok" } } }` |
| Not-ready | n/a | HTTP **503**, `status: "not_ready"`, failing check → `"unavailable"`. |

Readiness properties (`src/health/readiness.ts`, `src/routes/readiness.ts`):

- **Bounded** — each probe is raced against a timeout (default 2000 ms), so a
  hung dependency can never hang the request.
- **Fail-closed** — a probe that throws, rejects, or times out counts as
  `unavailable` and makes the instance not-ready.
- **Non-leaky** — the body carries only a coarse per-check status
  (`"ok"`/`"unavailable"`). Raw driver errors and connection strings are caught
  inside the probe and never surface. Regression-tested in
  `tests/infrastructure.test.ts`.

The database probe (`src/db/databaseHealth.ts`) issues the smallest safe
round-trip (`SELECT 1`) against the existing Prisma client — no schema mutation,
no migration, no recovery. In the in-memory dev store it trivially reports ready.

**Liveness intentionally has no dependency check** so a database blip restarts
healthy instances needlessly — readiness is the correct gate for that.

## 6. Prisma migration workflow

Migrations are an **explicit deployment operation**, never run from app startup
or an HTTP request. Production uses `prisma migrate deploy` (forward-only);
`prisma db push` and `prisma migrate dev` are **never** used in production.

1. Developer edits `prisma/schema.prisma`.
2. On a Prisma-supported host (see §16 — not Termux), generate the migration:
   `npx prisma migrate dev --name <change>`.
3. Review the generated SQL in `prisma/migrations/`.
4. Commit the migration alongside the schema change.
5. CI validates the migration (applies it to a scratch database, runs tests).
6. Production deploy step runs `npx prisma migrate deploy`.
7. Application instances start.
8. `GET /ready` confirms DB connectivity before the LB adds each instance.

Do **not** hand-edit `_prisma_migrations`. Do **not** reverse a destructive
migration blindly — prefer a compensating forward migration or a backup restore
(see §12).

## 7. Environment variables

Full descriptions live in the README table; the production-relevant contract:

**Required in production**
- `NODE_ENV=production` — enables Secure cookies + HSTS and fail-closed config.
- `DATABASE_URL` — PostgreSQL connection string (TLS). Missing → boot refused.
- `CORS_ORIGIN` — comma-separated **https**, non-loopback origins. Missing,
  wildcard, http, or loopback → boot refused.

**Optional / infrastructure**
- `REDIS_URL` — `redis://` or `rediss://` shared-state URL. Required only for
  multi-instance rate-limit correctness (§4). Validated on boot; the deployment
  constructs a `RedisLikeClient` from it and injects the Redis-backed store.
- `SESSION_TTL`, `SESSION_COOKIE_NAME`, environment-policy limits, and the
  `SECURITY_*` detection thresholds — see README.

Production config is **fail-closed**: `loadConfig` throws on missing/unsafe
security-critical values rather than falling back to dev defaults. Secrets are
never logged and never returned by any API response.

## 8. CORS

- Explicit allow-list only; **`*` is rejected in every environment**.
- Production requires absolute `https://` origins and rejects loopback hosts.
- Credentialed (`credentials: true`) so the session cookie flows; methods are
  limited to `GET`/`POST`/`DELETE`.
- Add an origin by appending it to `CORS_ORIGIN` (comma-separated) and
  redeploying — e.g. `https://cyvantas.in,https://lab.cyvantas.in`. No code
  change and no wildcard is ever needed.
- Unapproved origins are not echoed in `Access-Control-Allow-Origin`
  (regression-tested in `tests/infrastructure.test.ts`).

## 9. Session / cookie requirements

Verified against the existing Phase 8 implementation (`src/routes/auth.ts`,
`src/services/authService.ts`) — no redesign was needed:

- Session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production
  (`cookieSecure` is true iff `NODE_ENV=production`).
- The raw token is delivered ONLY as the cookie — never in a JSON body, never
  logged; only its SHA-256 hash is stored.
- Sessions are server-side and revocable: logout revokes the row; mass
  revocation is a `revokedAt` update / table truncate (see §12).
- No token is ever placed in `localStorage` (the frontend remains
  backend-disabled; when enabled it must rely on the cookie).
- Requires HTTPS in production (HSTS is emitted; cookies are Secure).

## 10. Deployment sequence

1. Provision PostgreSQL (+ optional Redis) and store `DATABASE_URL` /
   `REDIS_URL` in the platform secret manager.
2. Set `NODE_ENV=production` and `CORS_ORIGIN` (https, exact origins).
3. Run `prisma migrate deploy` against the production database (§6).
4. Deploy the API image (installed with `--omit=dev`).
5. Wire the LB liveness probe to `GET /health` and the readiness gate to
   `GET /ready`.
6. Roll instances one at a time; each joins rotation only after `/ready` = 200.
7. Confirm cookies are `Secure; HttpOnly; SameSite=Lax` and security headers are
   present on responses.

## 11. Backup / restore

See §12 of this doc for the operator checklist; the disaster-recovery narrative
(PITR, restore rehearsal, secret rotation, mass session invalidation) is in
`PRODUCTION-HARDENING.md` → Disaster recovery and is not duplicated here.

## 12. Backup / restore runbook

Execute once PostgreSQL is provisioned. **Do not run against a real database
from this repo/host today** — nothing is provisioned.

- [ ] **Frequency:** automated base backup daily + continuous WAL archiving for
      point-in-time recovery (PITR) where the provider supports it.
- [ ] **Retention:** define per the data-retention policy (e.g. 7 daily / 4
      weekly). Store backups **off the primary host**.
- [ ] **Encryption:** backups encrypted at rest and in transit; keys held in the
      secret manager, not with the backup.
- [ ] **Restore procedure:** provision a scratch instance, restore the latest
      base backup, replay WAL to the target timestamp, point a scratch API at it.
- [ ] **Restore verification:** run `npm test` and a smoke login/challenge-submit
      against the restored instance. An untested backup is not a backup.
- [ ] **PITR:** confirm the earliest recoverable timestamp meets the RPO before
      relying on it.

## 13. Rollback strategy

- **Application:** redeploy the previous known-good image/tag. Instances are
  stateless, so this is safe and fast.
- **Database:** migrations are forward-only. Prefer a **compensating forward
  migration**. For catastrophic corruption, restore from the pre-migration
  backup (§12). **Never blindly reverse a destructive migration.**
- **Configuration:** revert to the previous known-good config/secret set in the
  platform, then roll instances.
- **Sandbox:** not applicable — the sandbox runtime is not exposed and must stay
  unavailable until its isolation infrastructure is provisioned and reviewed.

## 14. Production secrets policy

- **Never commit:** `DATABASE_URL`, Redis credentials/`REDIS_URL`, session
  secrets, API keys, provider tokens, cloud credentials, private keys.
- `.env` is git-ignored; `.env.example` contains **placeholders only**.
- Production secrets come exclusively from the hosting platform's
  secret/environment mechanism, injected at runtime.
- Secret values are never printed in logs or tests and are never returned by any
  API response (readiness/health included — regression-tested).

## 15. Monitoring

- Structured, redaction-safe security events on stdout (JSON lines); ship the
  stream to the log sink. Flags/passwords/tokens can never reach a log line.
- Correlation id (`X-Request-Id`) on every response and error envelope for
  incident tracing.
- Observe-only detection escalates `…_ABUSE_SUSPECTED` events above the
  rate-limit thresholds. See `MONITORING.md` / `ABUSE-CONTROLS.md`.
- Wire alerts on: `/ready` flapping, 5xx rate, `…_ABUSE_SUSPECTED` volume, and
  the DB connection pool saturation exposed by the provider.

## 16. Sandbox prerequisite

The sandbox runtime is the `notConfiguredRuntimeProvider` seam:
`runtimeStatus` is always `NOT_PROVISIONED` and `runtimeConfigured` is `false`.
**No container, socket, process, or outbound call exists.** Before any real
runtime is exposed it requires, as a separate phase: isolation infrastructure
(a dedicated control plane + worker nodes in their own trust zone), a full
sandbox security review, real Docker-socket / host-FS / capability tests, and an
explicit opt-in flag. Until then the runtime stays unavailable by design.

## 17. Termux limitations

The build host is Termux / Android / aarch64, where:

- Prisma's native query/schema engines cannot run reliably, and PostgreSQL is
  not installed. Therefore **live DB queries and `prisma migrate dev/deploy`
  must run on a Prisma-supported host** (x86_64 / arm64 Linux) or in CI.
- The in-memory repository, `npm run build`, `npm run lint`, and `npm test` all
  run here **without** a database — but the in-memory store is **not** a
  production backend.
- No Docker, no Redis server, and no outbound network are used or required by
  the test/build path.

## 18. Production launch checklist

- [ ] PostgreSQL provisioned, TLS enforced, reachable only from the API network.
- [ ] `prisma migrate deploy` applied and reviewed (§6).
- [ ] Redis-compatible store provisioned **iff** running >1 instance, a
      `RedisLikeClient` constructed from `REDIS_URL`, and the Redis-backed
      `SharedStateStore` injected (§4).
- [ ] `NODE_ENV=production`, `DATABASE_URL`, `CORS_ORIGIN` (https, exact) set via
      the secret manager; boot succeeds (fail-closed config).
- [ ] LB liveness → `GET /health`; readiness gate → `GET /ready`.
- [ ] Cookies observed `Secure; HttpOnly; SameSite=Lax`; security headers
      present.
- [ ] Backups scheduled and a restore rehearsed (§12).
- [ ] Log sink receiving stdout security events; alerts wired (§15).
- [ ] `npm run lint`, `npm test`, `npm run build`, and `npm audit --omit=dev`
      clean.
- [ ] Sandbox runtime confirmed unavailable (`runtimeConfigured=false`).

## 19. Provider selection checklist

No provider is chosen. When selecting one, verify it offers:

- [ ] Managed PostgreSQL with TLS, automated backups, and PITR.
- [ ] A Redis-compatible store (only if multi-instance) with TLS.
- [ ] Runtime secret injection (not build-time bake-in).
- [ ] TLS-terminating edge/LB with configurable liveness + readiness probes and
      per-instance rotation.
- [ ] Stateless horizontal scaling for the API tier.
- [ ] Log aggregation for stdout JSON lines.
- [ ] A path (separate from the API tier) to host the future sandbox control
      plane in an isolated trust zone.

Keep the API code provider-neutral — selection changes only configuration and
the injected adapters, never the application code.

