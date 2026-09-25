# Abuse Controls (Phase 13)

Phase 13 adds layered, **fail-closed** rate limiting on every mutating and
security-sensitive endpoint, on top of the observe-only detection described in
[MONITORING.md](./MONITORING.md). Enforcement (this document) **denies**
requests; detection only observes.

## Two enforcement scopes

Every gated endpoint is checked against **both**:

- a **per-USER** limit — what one authenticated account can do;
- a **per-IP** ceiling — what one network origin can do regardless of account
  (this blunts credential stuffing and many-account abuse from one source).

The per-IP ceiling is set **above** the per-user limit so a single legitimate
user always trips the per-user limit first, while a burst spread across many
accounts from one origin still trips the IP ceiling.

## Rules

Defined in `src/security/rateLimiter.ts` (`RATE_RULES`), all server-authoritative:

| Endpoint                                   | Per-user            | Per-IP              |
|--------------------------------------------|---------------------|---------------------|
| `POST /auth/register`                      | —                   | 5 / hour (`register`) |
| `POST /auth/login`                         | 10 / 15 min (ip+email, `login`) | 30 / 15 min (`loginPerIp`) |
| `POST /challenges/:slug/environments`      | 20 / min            | 60 / min            |
| `POST /challenges/:slug/…/reset`           | 30 / min            | 90 / min            |
| `POST /challenges/:slug/submit`            | 15 / min            | 60 / min            |
| `POST /environments` (create)              | 30 / min            | 90 / min            |
| `POST /environments/:id/{start,touch,reset,stop}`, `DELETE`, `sandbox/provision` | 60 / min | 180 / min |

Submission is the tightest per-user rule to blunt flag brute-forcing. The
fixed-window limiter holds no state of its own — it reads and writes counters
through a `SharedStateStore`. The default in-memory store makes it
single-process; injecting the Redis-backed store
(`src/infra/redisSharedStateStore.ts`) makes the same limits global across
instances, with no change to callers.

## The abuse guard — fail-closed

`src/security/abuseGuard.ts` runs a request's checks in order:

- `evaluateAbuseChecks` returns the **first** scope that denies, or `null`.
- It is **FAIL-CLOSED**: if the underlying limiter *throws* (misconfiguration,
  or a future shared-store outage), the check is treated as **denied**, never as
  allowed. For auth, flag submission, and environment creation, falling open on
  uncertainty is unacceptable.
- `enforceAbuseControls` adds the side effects a route needs: on denial it emits
  a `RATE_LIMIT_EXCEEDED` security event carrying the human-readable **scope**
  (never the raw counter key) and throws a uniform **429**.

Routes wire it through thin helpers (`enforceChallengeLimit`, `enforceEnvLimit`,
`enforceAuthLimit`) that build the `{user, ip}` check pair and pass the
server-derived `RequestContext` (ip, userAgent, requestId, actorId).

## Abuse response — no information leakage

The 429 body is deliberately uniform and opaque:

```json
{ "error": { "code": "RATE_LIMITED",
             "message": "Too many requests. Please try again later.",
             "status": 429, "requestId": "…" } }
```

- **No** limit, remaining count, window, reset time, or scope is returned — a
  client cannot map the response to a specific control or discover the
  thresholds.
- The scope (e.g. `challenge-submit:ip`) lives only in the server-side event.
- The counter **key** (which embeds the userId / ip) is never emitted — only the
  coarse scope label is.

## No client-controlled bypass

- The **actor is the session**, never the request body. Per-user keys use
  `request.authUser.id`; a spoofed body `userId` is ignored.
- Origin is enforced (CSRF allow-list) before the limit check on every mutating
  route.
- Limits are constants in server config/env; there is no header, query, or body
  field that raises or disables a limit.

## Preserving legitimate access

Per-user limits are generous for real interactive use (e.g. 15 submissions/min),
and per-IP ceilings sit above them so shared-NAT users are not caught by another
account's burst until the origin as a whole is clearly abusive. Detection
thresholds (observe-only) sit higher still, so a normal session never emits an
abuse alert.

## Configuration

All rate-rule limits are server constants. Detection thresholds (which never
deny) are env-overridable — see `.env.example` and
[MONITORING.md](./MONITORING.md#detection--observe-only).

## Testing

- `tests/abuseGuard.test.ts` — order-sensitive first-deny, **fail-closed** on a
  throwing limiter, uniform 429 + scope-only event, no key/limit leakage.
- `tests/monitoringHttp.test.ts` — per-user 429, per-IP ceiling tripping across
  multiple accounts from one origin, correlation ids, redaction safety.
- `tests/monitoringUnit.test.ts` / `tests/monitoringSecurity.test.ts` —
  detection windows, redaction coverage, and architectural absence of
  execution/network primitives in the Phase 13 source.
