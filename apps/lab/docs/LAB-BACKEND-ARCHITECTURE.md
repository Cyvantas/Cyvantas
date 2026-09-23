# CYVANTAS Security Lab — Backend & Sandbox Architecture

> **Status: ARCHITECTURE ONLY (Phase 6).**
> Nothing in this document is deployed. No backend, database, queue, cache, or
> sandbox runtime exists yet. This is a design contract that later phases
> implement incrementally. No real vulnerable environments are created here.

The Security Lab teaches offensive and defensive web security through a strict
loop:

```
LEARN  →  BREAK  →  CAPTURE  →  VALIDATE  →  RESET / DESTROY
```

Every interactive challenge environment must be **isolated, temporary,
rate-limited, observable, and destroyable**. The browser is a client only; it
never controls the sandbox runtime and is never itself the vulnerable target.

---

## 1. Goals

- Serve challenge, learning, and mission content through a stable API that the
  existing React providers can adopt without UI changes.
- Provision **per-user, isolated, ephemeral** sandbox environments on demand and
  guarantee their destruction.
- Keep scoring, flags, and progress **server-authoritative** — the browser is
  never trusted to award points or reveal flags.
- Contain untrusted sandbox workloads behind hard network, resource, and
  filesystem boundaries with a default-deny posture.
- Remain safe by construction: no arbitrary command execution, no user-supplied
  images, no arbitrary target URLs, no SSRF primitives.
- Support authorized educational use only, with abuse controls that protect the
  platform and other learners.

## 2. Non-goals

- **Not** a bug-bounty platform, live-target scanner, or C2 framework.
- **Not** a place to run user-supplied code or images against arbitrary targets.
- **No** offensive infrastructure reachable from the public internet.
- **No** credential harvesting, PII collection, or third-party analytics.
- **No** persistence in the current frontend (no localStorage for progress).
- This phase deploys nothing and installs no database, cache, or queue.

## 3. System overview

```
                    CYVANTAS LAB
                         │
                         ▼
                  React Frontend
                         │
                         ▼
                    API Gateway
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
         Challenge     Learning     Mission
          Service      Service     Service
             │           │           │
             └───────────┼───────────┘
                         ▼
                 Environment Service
                         │
                         ▼
                  Sandbox Orchestrator
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Sandbox     Sandbox    Sandbox
              A           B          C
              │           │          │
              └───────────┼──────────┘
                          ▼
                    Reset / Destroy
```

The system splits cleanly into a **control plane** and a **data plane**:

- **Control plane** — API Gateway, auth, content services, environment service,
  orchestrator, database, cache, queue. It is trusted, validates everything, and
  never runs user-supplied code.
- **Data plane** — the isolated sandboxes that host deliberately vulnerable
  challenge applications. It is untrusted and fully contained.

**The frontend NEVER directly controls the sandbox runtime.** All environment
actions (provision, reset, destroy) are requests to the control plane, which
authorizes them and instructs the orchestrator. The browser only ever receives
an opaque `accessUrl` and a status; it cannot address the orchestrator, the
Docker/runtime socket, or another user's environment.

## 4. Frontend architecture

The frontend is the stable React/TypeScript/Vite app in `apps/lab`. Its data
access already flows through **providers** that hide the data source from
components:

```
Current:                        Future:

React                           React
  ↓                               ↓
Local Provider                  Provider
  ↓                               ↓
Static Data (src/data)          API Client  (src/lib/api)
                                  ↓
                                API Gateway
                                  ↓
                                Service
```

Existing providers and their future backing:

| Provider | Today | Future backend |
| --- | --- | --- |
| `ChallengeProvider` | static `data/challenges.ts` | `GET /api/challenges`, `GET /api/challenges/:slug` |
| `LearningProvider` | static `data/learningPaths.ts` | `GET /api/learning`, `GET /api/learning/:slug` |
| `LearningProgressProvider` | no-op (`supportsPersistence=false`) | `GET/PUT /api/progress/learning` (account-scoped) |
| `CTFProvider` | static `data/missions.ts` | `GET /api/missions`, `GET /api/missions/:slug` |
| `MissionProgressProvider` | no-op (`supportsPersistence=false`) | `GET/PUT /api/progress/missions`, `POST /api/missions/:id/submit` |
| `MissionEnvironmentProvider` | stub (`supportsProvisioning=false`) | `POST/GET/DELETE /api/environments` |

**The UI must not know whether data comes from mock data or a backend.** The
swap happens by replacing the `local*`/`noop*` provider implementation with one
that calls the shared `apiClient`; the interface and every consumer stay
identical. The capability flags (`supportsPersistence`, `supportsProvisioning`)
let components render honest UI in both worlds.

The Phase 6 frontend change is limited to a **safe API-client boundary**
(`src/lib/api/`) that defines this contract and ships a not-configured mock. It
makes **no network calls** and adds **no persistence**.

## 5. API Gateway

A single entry point in front of all services. Responsibilities:

- **TLS termination** and HTTP/2.
- **AuthN**: verify the session/access token, attach a `user identity`.
- **AuthZ pre-check**: coarse role gate before routing.
- **Rate limiting** (see §18) keyed by user, IP, and endpoint class.
- **Input validation**: request-body size caps, schema validation, content-type
  enforcement — reject malformed requests before they reach services.
- **Request correlation**: assign a `requestId` propagated to every service and
  returned in error envelopes.
- **Response normalization**: the success/error envelope in §20.

The gateway never proxies to a sandbox. Sandbox `accessUrl`s are served through
a separate, per-environment ingress path (see §7), not through the API gateway.

## 6. Authentication

**No authentication is implemented in Phase 6.** Documented as an interface
contract only.

Future flow:

```
Browser
  ↓
Identity Provider  (hosted auth or self-managed)
  ↓
Session / Access Token
  ↓
API Gateway  (verifies token)
  ↓
User identity  (userId, roles, session metadata)
```

Requirements when introduced:

- Secure, HTTP-only, `SameSite` session cookies **or** short-lived access tokens
  with refresh.
- Token/session **expiry** and server-side revocation.
- **CSRF protection** for cookie-based auth (double-submit token or `SameSite`
  strict + origin checks).
- Authorization checks on **every** state-changing endpoint (never client-side
  only).
- **Account deletion** and data export to meet retention/privacy obligations.
- **Rate limiting** on login and token endpoints (see §18).

No vendor is selected. Do not adopt one without a concrete architectural reason.

## 7. Authorization

Roles are conceptual and enforced **server-side**. The browser may hold a role
for UI hints, but the server never trusts it.

| Role | Capabilities |
| --- | --- |
| `USER` | start/reset/destroy **own** environment; submit flags; view **own** progress |
| `AUTHOR` | create/edit challenge, learning, and mission definitions (draft → review) |
| `ADMIN` | manage platform, users, published content, global limits |
| `SYSTEM` | orchestrator/internal operations (provision, cleanup) — not a human login |

Authorization rules:

- Every environment and progress record is **owned** by a `userId`; access is
  denied unless the caller owns it or is `ADMIN`.
- `AUTHOR` content changes land as drafts and require review before publish.
- `SYSTEM` credentials are internal service identities, never issued to browsers.

## 8. Challenge service

Serves challenge content and, where a challenge needs an interactive target,
references an **environment template** (never an inline image or command).

Current `Challenge` model (`models/challenge.ts`) stays as-is for the frontend.
Future **optional** backend fields (documented, not forced into frontend data):

| Field | Purpose |
| --- | --- |
| `environmentTemplateId?` | trusted template to provision when the challenge is interactive |
| `environmentRequired?` | whether solving needs a live environment |
| `flagStrategy?` | how the flag is validated (`static`, `dynamic-per-user`, `regex`, `checker`) |
| `scoringRules?` | point breakdown and bonuses (server-side) |
| `resourceProfile?` | CPU/memory/disk profile for the environment |
| `timeoutProfile?` | lifetime + inactivity limits for the environment |

These are **optional**. Non-interactive challenges (the current catalogue) omit
them entirely.

## 9. Mission service

Serves missions and stages (`models/ctf.ts`). Missions already reference
challenges, tools, and learning paths **by slug**, never by embedded copies — so
the service composes responses from the challenge/learning services rather than
duplicating content. Stage completion and flag submission route to the scoring
path (§11) and are server-authoritative.

## 10. Learning service

Serves learning paths, modules, and lessons (`models/learning.ts`). Read-mostly
content. Lessons reference challenges and tools by slug. Progress is handled by a
separate account-scoped progress store (§17), not embedded in content.

## 11. Environment service

The control-plane component that owns the **lifecycle** of sandbox environments.
It sits between the mission/challenge services and the orchestrator, and is the
only component the frontend's `MissionEnvironmentProvider` talks to (via the API
gateway).

Responsibilities:

- Validate and authorize provision/reset/destroy requests (ownership, quotas).
- Enforce **concurrency limits** and **lifetime/inactivity** policy.
- Translate a challenge/mission's `environmentTemplateId` into an orchestrator
  request for an **approved, digest-pinned image** (§14).
- Track environment records (§ Environment model) and emit lifecycle events.
- Enqueue provision/reset/destroy/cleanup jobs (§19) — it does not block on the
  runtime.

It never accepts an image reference, command, or target URL from the client. The
client only names a `missionId`/`challengeId`; the service resolves the rest.

## 12. Sandbox orchestrator

The `SYSTEM`-privileged component that actually creates and destroys sandbox
workloads on isolated compute. It is the **only** component that can talk to the
container/VM runtime.

Hard rules:

- The orchestrator exposes a **narrow internal API** (`provision(template)`,
  `destroy(id)`, `status(id)`) — never a generic "run this command/image" call.
- It accepts only **approved, digest-pinned templates** (§14); it cannot be
  asked to pull an arbitrary image.
- The **runtime socket (Docker/containerd) is never exposed** to the application
  tier or the network. Only the orchestrator, running on the sandbox host, holds
  it.
- It runs sandboxes under a dedicated, unprivileged service identity with the
  minimum capabilities required.

## 13. Environment provider interface

The frontend contract (`MissionEnvironmentProvider`, already stubbed) the future
API-backed implementation fulfils:

```ts
provision(missionId)        // → Environment (status PROVISIONING)
getEnvironment(environmentId)
getStatus(environmentId)    // → status only (cheap poll)
reset(environmentId)
destroy(environmentId)
```

Environment model:

```ts
interface Environment {
  id: string
  missionId: string
  userId: string
  status: EnvironmentStatus
  createdAt: string        // ISO-8601
  expiresAt: string        // ISO-8601, always set — environments are ephemeral
  accessUrl: string | null // opaque per-user ingress; null until READY
  region: string
  resourceProfile: string  // named profile, not raw limits
}
```

Statuses:

```
PROVISIONING → READY → RUNNING → RESETTING → EXPIRED → DESTROYING → DESTROYED
                                                    ↘ FAILED ↙
```

| Status | Meaning |
| --- | --- |
| `PROVISIONING` | orchestrator is creating the sandbox |
| `READY` | provisioned, health-checked, `accessUrl` available |
| `RUNNING` | learner is actively connected |
| `RESETTING` | state being wiped back to the template baseline |
| `EXPIRED` | lifetime/inactivity elapsed; pending cleanup |
| `DESTROYING` | teardown in progress |
| `DESTROYED` | terminal; record retained per retention policy |
| `FAILED` | provisioning/health/teardown error; must still be cleaned up |

Real provisioning is **not implemented** in this phase.

## 14. Environment lifecycle

```
REQUEST → VALIDATE → AUTHORIZE → PROVISION → HEALTH CHECK → READY
   → ACTIVE → TIMEOUT → RESET / DESTROY
```

1. **REQUEST** — client asks for an environment for a `missionId`.
2. **VALIDATE** — schema, mission exists and is interactive.
3. **AUTHORIZE** — caller owns the request; under concurrency quota.
4. **PROVISION** — enqueue a job; orchestrator creates the sandbox from the
   approved template.
5. **HEALTH CHECK** — probe the challenge app before exposing it.
6. **READY** — `accessUrl` issued.
7. **ACTIVE** — learner works; activity resets the inactivity timer.
8. **TIMEOUT** — max lifetime or inactivity elapsed → `EXPIRED`.
9. **RESET / DESTROY** — wipe to baseline, or tear down and free resources.

Policy values are **configurable**, not hardcoded production policy now.
Illustrative defaults:

| Policy | Illustrative default |
| --- | --- |
| Maximum lifetime | 60 min |
| Inactivity timeout | 15 min |
| Max concurrent environments / user | 1 |
| Cleanup after disconnect | after inactivity timeout |
| Cleanup after expiration | immediate teardown job |
| Failed-provisioning cleanup | force-destroy + resource reclaim |

Every path (disconnect, expiry, failure) must converge on `DESTROYED` and free
all resources. Cleanup is idempotent (§ Failure handling).

## 15. Sandbox isolation

Each environment runs with hard containment. The future sandbox must have:

- **Isolated network namespace** — its own stack, no shared host networking.
- **Restricted outbound network** — default-deny egress (§16).
- **No access to internal services** — cannot reach the control plane, DB,
  cache, queue, or other sandboxes.
- **No access to cloud metadata** — `169.254.169.254` and equivalents blocked.
- **No host filesystem access** — no host bind mounts.
- **No Docker/runtime socket** — never mounted into the sandbox.
- **CPU limit**, **memory limit**, **process/PID limit**, **disk quota**.
- **Execution timeout** and **automatic destruction**.
- Dropped Linux capabilities, `no-new-privileges`, seccomp/AppArmor profile,
  read-only root FS with a small writable scratch dir (§17 image model).

**Control plane vs data plane** is the core boundary: the control plane never
executes user-supplied commands, and untrusted sandbox code can never reach the
control plane. A sandbox that is fully compromised must still be contained to
its own namespace and destroyable from outside.

## 16. Network model

Default-deny at every hop.

```
Internet
   X   (no inbound to sandboxes; no arbitrary outbound from sandboxes)
   │
API Gateway        (public ingress, authenticated)
   │
Control Plane      (private; services, orchestrator)
   │
Sandbox Network    (isolated per-environment namespace)
   │
Challenge Application  (the deliberately vulnerable target, contained)
```

Rules:

- Sandboxes get **no arbitrary outbound traffic**. Egress is denied by default.
- If a challenge needs an external dependency, it uses an **explicitly
  allowlisted, controlled service** (e.g. an internal mock DNS/HTTP fixture),
  never the open internet.
- Sandboxes cannot initiate connections to the control plane, other sandboxes,
  cloud metadata, or internal management ranges.
- Learner access to a sandbox goes through a **per-environment, authorized
  ingress** bound to that user's environment — not a shared or public endpoint.

This is a **future implementation requirement**; nothing is provisioned now.

## 17. Sandbox image model

Users **never** submit container images or commands. Challenges reference trusted
immutable definitions:

```
Challenge → Environment Template → Approved Image → Sandbox
```

Requirements:

- **Image digest pinning** (`@sha256:…`), not floating tags.
- **Approved base images** from an internal, scanned registry.
- **Vulnerability scanning** in CI before an image is approved.
- **Minimal privileges**: non-root user, dropped capabilities,
  `no-new-privileges`.
- **Read-only base filesystem** where possible, with explicit, small
  **writable scratch directories** for challenge state.
- Reproducible builds so an environment can be reset to a known baseline.

The "vulnerability" in a challenge is intentional and **contained inside the
sandbox app** — it is never a vulnerability in the control plane or host.

## 18. Flags

```
Mission → Stage → Flag
```

Flag record:

```ts
interface Flag {
  id: string
  challengeId: string | null
  stageId: string | null
  validationType: "static" | "regex" | "dynamic-per-user" | "checker"
  points: number
}
```

Rules:

- The **expected flag is never sent to the frontend** before a successful
  validation. It lives only in the backend/secret store.
- Submissions are validated **server-side** against the flag record.
- `dynamic-per-user` flags are minted per environment so a leaked flag from one
  learner does not validate for another.
- `checker` flags run a server-side verifier (e.g. "did the learner achieve the
  state?") rather than string comparison.

Flag validation is **not implemented** in this phase.

## 19. Scoring

Server-authoritative. **The browser never awards itself points.**

Example point model:

```
Challenge: 100   Stage: 25   Flag: 25
```

Future endpoint:

```
POST /api/missions/:id/submit
  validate → calculate → record → return result
```

- `validate` submission (auth, ownership, rate limit, flag check).
- `calculate` points from server-side `scoringRules` (first-blood/time bonuses
  optional, all server-side).
- `record` a `ScoreEvent` (append-only) and update progress.
- `return` only the outcome (correct/incorrect, points awarded) — never the
  expected flag.

No implementation now.

## 20. Progress

Account-scoped and server-owned. Tracks per-user learning and mission progress
(`LearningProgress`, `MissionProgress`, `ChallengeAttempt`). Derived from
`ScoreEvent`s where possible so it can be recomputed and audited.

Until accounts exist, the frontend progress providers stay **no-op** with
`supportsPersistence=false` — no localStorage, per constraint. The UI shows
"progress will be available when Lab accounts are introduced" rather than faking
saved state.

## 21. Rate limiting

Layered controls, all server-side:

```
User → IP → Endpoint → Environment
```

| Action | Rationale |
| --- | --- |
| login / token | brute-force and credential-stuffing defense |
| environment creation | prevent resource exhaustion |
| environment reset | prevent reset thrashing |
| flag submission | prevent brute-forcing flags |
| general API requests | baseline abuse protection |

Limits are enforced at the gateway and refined per service. Not implemented now.

## 22. Abuse prevention

- **Concurrent environment limits** per user (illustrative default: 1).
- **Environment lifetime limits** and **inactivity teardown**.
- **Reset limits** and **submission limits** (rate + daily caps).
- **Request body size limits**; reject oversized payloads at the gateway.
- **WebSocket / message limits** if realtime is added later (message rate, size,
  connection count).
- **Automatic cleanup** of expired/abandoned environments.
- **Suspicious-activity logging**: operational security signals only (e.g. burst
  of failed flag submissions), keyed to protect the service.

Collect **only operational security data necessary to protect the service**. No
surveillance-heavy analytics, behavioral profiling, or third-party tracking.

## 23. Secrets handling

Secrets must **never** exist in:

- frontend source
- `VITE_*` variables (these are bundled and public)
- Git
- challenge definitions
- browser local/session storage

Future backend secrets live in a **server-side secret manager**, injected at
runtime. Never exposed to the browser:

- database credentials
- orchestrator / runtime credentials
- signing keys (session/JWT)
- API keys
- cloud credentials

Flag values are secrets (§18) and follow the same rules.

## 24. Database

Future **relational** model (no database installed, no migrations yet).

Conceptual entities and relationships:

```
User 1───∞ LearningProgress ∞───1 LearningPath
User 1───∞ ChallengeAttempt ∞───1 Challenge
User 1───∞ MissionProgress  ∞───1 Mission 1───∞ MissionStage
User 1───∞ Environment       ∞───1 Mission
User 1───∞ FlagSubmission    ∞───1 Flag ∞───1 Challenge / MissionStage
User 1───∞ ScoreEvent
```

| Entity | Notes |
| --- | --- |
| `User` | identity, role, timestamps |
| `LearningPath` / `Challenge` / `Mission` / `MissionStage` | content (may also be file-sourced) |
| `LearningProgress` / `MissionProgress` | per-user, per-content progress |
| `ChallengeAttempt` | record of an attempt on a challenge |
| `Environment` | lifecycle record (§13), owned by a user |
| `Flag` | expected-value secret + validation type (§18) |
| `FlagSubmission` | append-only; who submitted what, correct/incorrect |
| `ScoreEvent` | append-only source of truth for scoring (§19) |

Content entities may be seeded from the existing `src/data/*` files so the API
serves the same data the frontend uses today.

## 25. Cache

Future in-memory cache (e.g. Redis-class) — **not installed now**. Candidate uses:

- **Sessions** / token introspection results.
- **Rate-limit counters** (per user/IP/endpoint).
- **Environment status** for cheap polling without hitting the orchestrator.

Cache is an optimization; the system must remain correct if the cache is cold or
unavailable.

## 26. Queue

Future job queue — **not installed now**. Environment operations are asynchronous
and run as idempotent jobs:

- `provision environment`
- `destroy environment`
- `reset environment`
- `cleanup expired environments` (scheduled sweep)

Jobs carry the `environmentId` and are safe to retry. Duplicate delivery must not
double-provision or error on an already-destroyed environment (§ Failure
handling).

## 27. API design

Future REST-style surface (documented, not implemented). Content endpoints map
1:1 to existing providers so the swap is invisible to the UI.

```
GET    /api/challenges
GET    /api/challenges/:slug

GET    /api/learning
GET    /api/learning/:slug

GET    /api/missions
GET    /api/missions/:slug

POST   /api/environments            # body: { missionId }
GET    /api/environments/:id
POST   /api/environments/:id/reset
DELETE /api/environments/:id

POST   /api/missions/:id/submit     # body: { stageId?, flag }
```

Every endpoint validates, in order: **authentication → authorization →
ownership → rate limit → input schema**. State-changing endpoints additionally
enforce concurrency/abuse limits. `POST /api/environments` accepts only a
`missionId` — never an image, command, or target URL.

## 28. API response model

Consistent envelope for every response.

Success:

```json
{ "data": {} }
```

Error:

```json
{ "error": { "code": "STRING_CODE", "message": "Human-readable", "requestId": "uuid" } }
```

- `code` is a stable machine-readable string (e.g. `RATE_LIMITED`,
  `NOT_FOUND`, `FORBIDDEN`, `ENVIRONMENT_LIMIT`).
- **Never** return stack traces, internal hostnames, image digests, or
  orchestrator details to clients.
- `requestId` correlates the client error with server logs (§29).

## 29. Logging

Three separated streams, different sensitivity and retention:

| Stream | Contents | Notes |
| --- | --- | --- |
| **Security audit** | auth events, authz denials, role changes, admin actions | tamper-evident, longer retention |
| **Application** | request/response metadata, errors, `requestId` | operational |
| **Sandbox** | per-environment runtime logs | controlled, short retention |

**Never log**: passwords, tokens, submitted flags/secrets, full `Authorization`
headers, or unnecessary raw user input. Redact by default; log identifiers, not
payloads.

## 30. Monitoring

- **Health/readiness** probes per service and per environment.
- **Metrics**: provision latency, environment count, failure rates, queue depth,
  rate-limit hits, teardown success.
- **Alerts**: stuck environments (not reaching `DESTROYED`), provision failure
  spikes, resource saturation, orphaned sandboxes.
- Dashboards derive from operational metrics only — not user surveillance.

## 31. Data retention

- **Sandbox logs / state**: short retention; destroyed with the environment or
  shortly after.
- **Environment records**: retained briefly for audit, then pruned.
- **Security audit logs**: longer retention for investigation.
- **User data**: minimal by design; support account deletion and export.
- No PII beyond what an account requires. No third-party analytics.

## 32. Disaster recovery

- **Content** is reproducible from source (`src/data/*` seeds / version
  control) — low RPO.
- **Progress / scores** (`ScoreEvent` append-only) backed up regularly; progress
  is recomputable from events.
- **Environments are ephemeral** — never part of DR; on region loss they are
  simply re-provisioned on demand.
- Orphaned sandboxes after an incident are reclaimed by the cleanup sweep (§26)
  and reconciliation against environment records.
- Documented restore procedure for database + secret manager.

## 33. Threat model

Do not claim perfect security. Residual risk remains for every item.

| # | Threat | Attack surface | Impact | Mitigation | Residual risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Malicious learner | API, sandbox, flag submit | abuse, resource drain, flag brute-force | authz, rate limits, quotas, dynamic flags | determined abuse within limits |
| 2 | Compromised sandbox | sandbox workload | pivot attempt to host/control plane | net isolation, dropped caps, seccomp, no socket, no metadata | novel kernel/runtime escape |
| 3 | Malicious challenge author | content definitions | ship harmful image/logic | approved images only, digest pinning, scanning, review, draft gate | insider with review access |
| 4 | API abuse | public endpoints | DoS, scraping | gateway rate limits, body caps, auth | distributed low-and-slow |
| 5 | Container escape | runtime/kernel | host compromise | hardened runtime, minimal privileges, patched kernel, per-host isolation | zero-day escape |
| 6 | SSRF | sandbox / any URL-taking input | reach metadata/internal svcs | default-deny egress, metadata block, no arbitrary target URLs | allowlisted-service misuse |
| 7 | Resource exhaustion | env creation, sandbox | starve others | CPU/mem/PID/disk limits, concurrency caps, timeouts | burst within quota |
| 8 | Credential leakage | logs, responses, frontend | secret exposure | secret manager, log redaction, no secrets in `VITE_*`, envelope hygiene | misconfiguration |
| 9 | Cross-user env access | env ingress, API | view/control others' env | per-user ownership checks, per-env authorized ingress | broken authz bug |
| 10 | Flag manipulation | flag submit | unearned solves | server-side validation, flags never sent to client, dynamic flags | leaked static flag reuse (mitigated by dynamic) |
| 11 | Score manipulation | submit endpoint, client | fake points | server-authoritative scoring, append-only `ScoreEvent` | server bug |
| 12 | Host compromise | sandbox host | full data-plane loss | isolate data plane from control plane, least privilege, no shared secrets | catastrophic escape (contained to data plane) |

## 34. Trust boundaries

```
UNTRUSTED                TRUSTED                    HIGHLY TRUSTED
─────────                ───────                    ──────────────
Browser              →   API validation         →   Secrets
User input           →   Authorization service  →   Database
Challenge submission →   Orchestrator           →   Host infrastructure
Sandbox process      →   Approved env defs      →   Cloud credentials
```

- Data crosses left→right only after validation/authorization.
- **Untrusted sandbox code must never cross into the control plane.** A sandbox
  is a leaf: it receives an approved image and is destroyed; it cannot call
  inward.
- Secrets/DB/host live in the highly-trusted zone and are never reachable from
  the browser or a sandbox.

## 35. Failure handling

Every failure path must converge on a safe, cleaned-up state.

| Failure | Behavior |
| --- | --- |
| Sandbox fails to start | mark `FAILED`, enqueue force-destroy, reclaim resources, surface generic error |
| Health check fails | do not expose `accessUrl`; treat as failed provision |
| Sandbox unreachable | mark unhealthy; teardown + optional re-provision |
| Reset fails | fall back to destroy + re-provision |
| Destroy fails | retry; escalate to reconciliation sweep; alert if orphaned |
| Duplicate queue message | idempotent handlers — no double-provision, no error on already-destroyed |
| API timeout | client gets a normalized error + `requestId`; operation may still complete server-side and reconcile |
| Database unavailable | fail closed on writes; degrade reads to cache where safe |
| Orchestrator unavailable | reject new provisions with clear error; existing environments continue; queue drains on recovery |

**Cleanup must be idempotent.** A repeated `destroy` on an already-`DESTROYED`
environment is a safe no-op that returns success. Reconciliation periodically
compares environment records against actual runtime state and reclaims orphans.

## 36. Development environment

Local development never requires Docker vulnerability infrastructure or public
exposure.

```
Developer
  ↓
Local Lab UI  (Vite dev server)
  ↓
Mock API      (in-process, static data)
  ↓
Mock Environment Provider  (supportsProvisioning=false)
```

- The mock API returns the same envelopes (§20) backed by `src/data/*`.
- No real sandbox, no network egress, nothing internet-facing.
- Developers can build and test the full UI against mocks; the real backend is
  swapped in per phase behind the same interfaces.

## 37. Deployment model

Future split (deploy **nothing** now):

| Concern | Target |
| --- | --- |
| Frontend | Vercel (static SPA) |
| API | dedicated backend runtime (containerized service) |
| Database | managed relational database |
| Queue / cache | managed infrastructure |
| Sandbox | dedicated isolated compute, separate from the control plane |

The sandbox compute is deliberately **separate** from the control-plane compute
so a data-plane compromise cannot reach control-plane infrastructure.

## 38. Future scaling

- **Content services** are stateless and horizontally scalable behind the
  gateway; cache hot content.
- **Environment service** scales with orchestrator capacity; concurrency quotas
  bound total sandboxes.
- **Sandbox hosts** scale as a pool; the orchestrator schedules across them and
  reclaims aggressively.
- **Queue** absorbs provision/destroy bursts; workers scale on queue depth.
- **Database** reads scale via replicas/cache; `ScoreEvent` append-only design
  eases sharding later.

## 39. Architecture diagrams

**Lab overview**

```
FRONTEND
   ↓
API GATEWAY
   ↓
SERVICES  (Challenge · Learning · Mission · Progress)
   ↓
ENVIRONMENT SERVICE
   ↓
ORCHESTRATOR
   ↓
ISOLATED SANDBOX
```

**Control plane**

```
API
 │
 ├── Auth
 ├── Challenge
 ├── Learning
 ├── Mission
 ├── Progress
 └── Environment
          │
          ▼
      Orchestrator
```

**Data plane**

```
Sandbox
 ├── Challenge application
 ├── Flag validation target
 └── Temporary state
```

The **control plane** validates, authorizes, orchestrates, and holds all trust.
The **data plane** is the disposable, isolated sandbox. The only link is the
orchestrator issuing an approved image into a contained namespace and later
destroying it — nothing flows back inward.

## 40. Implementation roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| **6** | Architecture (this document) + safe API-client boundary | **current** |
| 7 | Backend API skeleton (content endpoints, envelope, validation) | future |
| 8 | Authentication + database | future |
| 9 | Environment service (records, lifecycle, quotas) | future |
| 10 | Sandbox orchestration (approved images, isolation) | future |
| 11 | First isolated challenge environment | future |
| 12 | Flag validation + scoring | future |
| 13 | Monitoring + abuse controls | future |
| 14 | Production hardening | future |

Do not implement future phases now.

## 41. Frontend changes in this phase

Scoped strictly to preparing clean interfaces:

- `src/lib/api/types.ts` — the success/error response envelope (§20) and a typed
  client error.
- `src/lib/api/apiClient.ts` — the `ApiClient` interface plus a
  **not-configured** mock (`notConfiguredApiClient`) that makes **no network
  calls** and throws a clear error if invoked. The active `apiClient` export
  points at the mock.

Existing providers are **unchanged**: they still read static data / return
no-op. When a real backend arrives, each provider's implementation is swapped to
call `apiClient` behind the same interface — no consumer changes, no persistence
added to the frontend now.














