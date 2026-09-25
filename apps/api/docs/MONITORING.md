# Monitoring & Security Observability (Phase 13)

Phase 13 gives the API a single, server-authoritative funnel for security and
application events, plus observe-only detection over those events. It changes
**no** business logic: it instruments the existing audit seam and adds
request-level correlation. Nothing here provisions a sandbox, executes code,
opens a socket, or makes a network call.

```
request ──▶ requestId assigned (onRequest, FIRST hook)
        ──▶ requestObserved / invalidSession (onRequest, observe-only)
        ──▶ route handler
              ├─ enforce…Limit(…)  ─┐ abuse guard (fail-closed) ── denies ▶ 429
              └─ service.*          │  on denial ▶ RATE_LIMIT_EXCEEDED event
                    │               │
                    └─ audit.record ─┴─▶ monitored audit repo
                                          ├─ inner.record()  (persist)
                                          └─ monitor.fromAudit()
                                                ├─ emit structured event
                                                └─ detection.record() ── trips ▶ …_ABUSE_SUSPECTED
                                                                                 │
                                                                                 ▼
                                                                               sink
```

## The instrumentation seam

Every service already records audit events through
`repositories.audit.record({ event, userId, ip, userAgent })`. `buildApp` wraps
that repository with `createMonitoringAuditRepository(inner, monitor)`:

- it **forwards to `inner.record()` first** (the persisted audit write is
  authoritative and must not be affected by observability);
- then calls `monitor.fromAudit(input)` inside a `try/catch` that swallows any
  error — observability can never break a request or a write.

Because the wrap is at the repository boundary, **all** existing call sites
(auth, environment, challenge, scoring) are instrumented with zero service
changes.

## Event model

Events are a single vocabulary (`src/monitoring/events.ts`) split into two
families:

- **Audit-derived** — one per persisted `AuditEvent` (LOGIN_SUCCESS,
  CHALLENGE_SUBMISSION_REJECTED, ENVIRONMENT_CREATED, …). Category + severity
  come from `AUDIT_EVENT_META`; anything unmapped falls back to a safe
  `REQUEST`/`INFO` default.
- **Detection / abuse** (`DetectionEventName`) — emitted by the monitor when a
  threshold is crossed or a request anomaly is seen: `RATE_LIMIT_EXCEEDED`,
  `AUTH_ABUSE_SUSPECTED`, `CHALLENGE_SUBMISSION_ABUSE_SUSPECTED`,
  `ENVIRONMENT_ABUSE_SUSPECTED`, `INVALID_SESSION_PRESENTED`,
  `INVALID_SESSION_ABUSE_SUSPECTED`, `REQUEST_BURST_SUSPECTED`.

Every emitted `SecurityEvent` carries: `name`, `category`, `severity`,
`timestamp` (ISO-8601), `requestId`, `actorId` (server-derived), `ip`,
`userAgent`, `outcome` (`success | failure | denied | detected`), and a redacted
`detail`.

| Field      | Source                                             |
|------------|----------------------------------------------------|
| `actorId`  | server session only — **never** request body       |
| `ip`       | `request.ip`, bounded to 64 chars                   |
| `userAgent`| request header, bounded to 256 chars                |
| `requestId`| correlation id (see below)                          |

## Correlation IDs

The **first** `onRequest` hook assigns `request.requestId`: it honors an inbound
`X-Request-Id` when it is a sane length (1..200 chars), otherwise mints a
`randomUUID()`. The id is:

- echoed on every response as the `x-request-id` header;
- attached to every **error** envelope (`error.requestId`) by the central error
  handler, so a client can quote it in a report and it joins to the server-side
  events.

## Detection — observe-only

Detection is a set of fixed-window counters (`src/monitoring/detection.ts`),
**separate** from the rate limiter. It never denies a request; it only reports
the exact occurrence that first crosses a threshold, so the monitor emits **one**
`…_ABUSE_SUSPECTED` event per window rather than one per occurrence.

| Signal              | Keyed by     | Default threshold / window | Escalation event |
|---------------------|--------------|----------------------------|------------------|
| failed auth         | ip, user     | 8 / 15 min                 | `AUTH_ABUSE_SUSPECTED` |
| challenge submission| user         | 40 / 1 min                 | `CHALLENGE_SUBMISSION_ABUSE_SUSPECTED` |
| environment activity| user         | 40 / 1 min                 | `ENVIRONMENT_ABUSE_SUSPECTED` |
| invalid session     | ip           | 12 / 5 min                 | `INVALID_SESSION_ABUSE_SUSPECTED` |
| request burst       | ip           | 600 / 1 min                | `REQUEST_BURST_SUSPECTED` |

Thresholds are env-overridable (see `.env.example`) and sit **above** the
per-user rate limits, so a single well-behaved user never trips a detection
alert. State is per-process (matching the rate limiter) and resets on restart; a
multi-instance deployment would back it with a shared store behind the same
narrow interface.

## Sinks

A sink (`src/monitoring/sink.ts`) is the output boundary. It receives
fully-formed, already-redacted events and only serializes/forwards them. Sinks
are synchronous and **must not throw**.

- `createConsoleSink` — one JSON line per event (`{ "kind": "security_event", … }`)
  to a writer (default `process.stdout`); swallows write/serialize errors.
- `createMemorySink` — captures events for test assertions.
- `createNoopSink` — discards events (the default under test so the suite stays
  quiet).

`buildApp` selects console vs noop from `config.security.logSecurityEvents`
(default true, except under test) and accepts an injected `sink` for tests.

## Redaction & retention

See [ABUSE-CONTROLS.md](./ABUSE-CONTROLS.md) for the enforcement side. Redaction
rules (`src/monitoring/redaction.ts`):

- the **value** of any sensitive-looking key is replaced with `[REDACTED]`
  (passwords, tokens, session tokens, flags, authorization/cookie headers,
  secrets, credentials, private keys, api keys, hashes, answers);
- strings are capped (512), arrays capped (50), recursion capped (depth 4);
- ip / user-agent are normalized and bounded.

**We never log** passwords, password hashes, session tokens, challenge flags,
authorization headers, cookies, or answers. `detail` payloads are built by our
own code and should already be clean; redaction is defense-in-depth applied
again on the way out.

**Retention** is a property of the sink target, not this code. The console sink
emits to stdout; the operator's log pipeline owns rotation/retention. Recommended
posture: retain security events long enough for incident review (e.g. 30–90
days), store them separately from application logs, and never ship them to a
destination that is not access-controlled.
