# Sandbox Orchestration (Phase 10)

The sandbox orchestrator is the single place where sandbox provisioning and
lifecycle **policy** is coordinated. It sits between the control-plane
environment records (Phase 9) and the **runtime-provider seam**:

```
route → environmentService (ownership / record) → sandboxOrchestrator
        (policy · runtime invocation · audit · timeouts · idempotency)
        → EnvironmentRuntimeProvider  (the ONLY I/O seam)
```

> **Phase 10 provisions NO real container, process, or namespace.** It defines
> the abstraction and enforces server-authoritative policy. The production
> runtime will implement the existing `EnvironmentRuntimeProvider` interface
> later, without changing the orchestrator, service, or routes. In this build
> the wired provider is `notConfiguredRuntimeProvider`, so `provision`/`start`/
> `reset` always return a controlled `SANDBOX_RUNTIME_UNAVAILABLE`, and
> `stop`/`destroy` are safe idempotent no-ops.

## Trust boundary

The sandbox is treated as an **untrusted execution boundary**. Everything a
client proposes is untrusted input; every safety decision is made
server-side. The orchestrator itself has **no execution capability**: it runs
no shell, spawns no child process, opens no socket, invokes no Docker/K8s API,
touches no host filesystem, and makes no arbitrary network call. Its only outward
dependency is the injected runtime-provider interface. This is enforced by a
security regression test (`tests/sandboxSecurity.test.ts`) that scans the
orchestration source for forbidden imports/call sites and proves behavioral
absence.

## Orchestrator responsibilities

- Resolve + validate a client-proposed policy **before** any runtime call.
- Invoke the runtime provider (never a real container directly).
- Enforce server-authoritative operation deadlines (timeouts).
- Provide per-process idempotency for successful provisions.
- Emit structured audit events for every step.
- Return only **safe DTOs** — never runtime ids, hostnames, node addresses,
  internal IPs, filesystem paths, container ids, provider metadata, or the
  resolved egress destinations.

The orchestrator makes **no** ownership decision — that is enforced upstream by
`environmentService.getEnvironment`, which returns `ENVIRONMENT_NOT_FOUND` (404)
for an environment the caller does not own.

## Policy model (server-authoritative)

`resolveSandboxPolicy(request)` merges the untrusted proposal over conservative
defaults and validates the result. It **never silently clamps** an out-of-range
value — it **rejects** it with a non-sensitive reason code. Defaults are
deny/deny/off.

### Resources

Finite positive integers, each with a fixed server ceiling. A client may request
tighter (smaller) values, never larger.

| Limit | Default | Maximum |
| ----- | ------- | ------- |
| `cpuMillis` | 500 | 2000 |
| `memoryMb` | 256 | 1024 |
| `diskMb` | 512 | 2048 |
| `pids` | 64 | 256 |
| `maxLifetimeSeconds` | 900 | 3600 |
| `idleTimeoutSeconds` | 300 | 1800 |

Non-integer, non-positive, or infinite values are rejected as `*_INVALID`;
above-ceiling values as `*_EXCEEDED`.

### Capabilities (default deny)

All capabilities default to `false`. The dangerous ones — `allowPrivileged`,
`allowHostFilesystem`, `allowDeviceAccess`, `allowRawSockets` — are **hard
denied**: requesting them is a rejection, never a silent downgrade. Outbound
sub-capabilities (`allowOutboundHttp`, `allowOutboundDns`) require `allowNetwork`.

### Network (default deny + SSRF-safe egress allowlist)

Ingress defaults to `deny`; `controlled` ingress from a public client is rejected
(`NETWORK_INGRESS_NOT_ALLOWED`). Egress defaults to `deny`. An `allowlist` egress
requires the network capability, and **every** destination is classified
server-side via `classifyDestination`. Rejected destination classes:

- loopback (`localhost`, `127.0.0.0/8`, `::1`)
- link-local (`169.254.0.0/16`, `fe80::/10`)
- private (`10/8`, `172.16-31`, `192.168/16`, CGNAT `100.64/10`, `fc00::/7`)
- cloud metadata (`169.254.169.254`, `metadata.google.internal`, …)
- unix sockets (`unix:…`, `/var/run/docker.sock`)
- unspecified (`0.0.0.0`, `::`)
- route-everything wildcards (`*`, `0.0.0.0/0`, `::/0`)
- internal TLDs (`.internal`, `.local`, `.cluster.local`) and bare single-label hosts
- malformed / empty

### Filesystem

Root is always read-only (`readOnlyRootFilesystem: true`); disabling it is
rejected. Host mounts are never permitted. Writable paths are in-sandbox scratch
dirs only, never host paths.

## Lifecycle & Phase 9 coupling

The orchestrator coordinates with, but does not replace, the Phase 9
control-plane state machine. Routes load the environment record (ownership) via
the environment service, then delegate the sandbox decision to the orchestrator.
Operations: `describeSandbox` (read-only, no runtime call), `provision`, `start`,
`reset`, `stop`, `destroy`.

## Idempotency

Successful provisions are cached per-process, keyed by `${env.id}::${key}` where
`key` is the `Idempotency-Key` header. A repeated key returns the cached
descriptor without re-invoking the runtime. `destroy` clears the cache for that
environment so a later provision never reuses a stale descriptor.

## Timeouts (server-authoritative)

Every runtime call races against a server-set deadline (`Promise.race` against a
sentinel). A deadline yields `SANDBOX_TIMEOUT` (504) and a `SANDBOX_TIMEOUT`
audit event. Deadlines are never client-controlled.

| Operation | Default deadline (ms) |
| --------- | --------------------- |
| provision | 30000 |
| start | 15000 |
| reset | 20000 |
| stop | 15000 |
| destroy | 15000 |

## Audit events

Fifteen `SANDBOX_*` events extend the global `AuditEvent` enum:
`SANDBOX_PROVISION_REQUESTED`, `SANDBOX_PROVISION_REJECTED`,
`SANDBOX_PROVISION_STARTED`, `SANDBOX_READY`, `SANDBOX_START_REQUESTED`,
`SANDBOX_STARTED`, `SANDBOX_STOP_REQUESTED`, `SANDBOX_STOPPED`,
`SANDBOX_RESET_REQUESTED`, `SANDBOX_RESET`, `SANDBOX_DESTROY_REQUESTED`,
`SANDBOX_DESTROYED`, `SANDBOX_RUNTIME_UNAVAILABLE`, `SANDBOX_POLICY_REJECTED`,
`SANDBOX_TIMEOUT`. Audit records carry only the actor and non-sensitive context.

## Error model

| Error | Status | Meaning |
| ----- | ------ | ------- |
| `SANDBOX_POLICY_REJECTED` | 422 | Proposed policy violated a server rule. Non-sensitive `reasons[]` attached. |
| `SANDBOX_RUNTIME_UNAVAILABLE` | 503 | No runtime provider is configured (Phase 10 default). |
| `SANDBOX_PROVISION_FAILED` | 502 | Provider reported failure. Internal code/message never surfaced. |
| `SANDBOX_TIMEOUT` | 504 | A runtime operation exceeded its server deadline. |

External messages are always generic; rejection reasons name a *limit*, never a
value or internal detail.

## Safe DTO

`SandboxDescriptorDTO` whitelists only shippable fields: `environmentId`,
`runtimeAvailable`, and a summarized `policy` (resources, network with
`allowedDestinationCount` instead of the destination list, capabilities,
filesystem with `writablePathCount`). It never contains `userId`, `metadata`,
node IPs, or the concrete egress destinations.

## Termux / environment limitation

This project is developed on Termux/Android (aarch64), which cannot run Docker,
the Prisma query engine, or a container runtime. Phase 10 therefore ships the
**abstraction and policy only**. The audit-enum migration
(`prisma/migrations/20260924180000_sandbox_audit_events/migration.sql`) is
hand-authored (idempotent `ALTER TYPE … ADD VALUE IF NOT EXISTS`) because the
engine cannot generate it here; it adds no table, column, or runtime.

## Future production runtime requirements

A production runtime must implement `EnvironmentRuntimeProvider` with
`configured: true` and:

- enforce the resolved resource limits (cgroups/quotas),
- enforce the network policy (default-deny + validated egress allowlist, no
  metadata/loopback/private access),
- run with a read-only root, no host mounts, no privileged mode, dropped
  capabilities, and no device access,
- return only non-sensitive results (no host ids/paths/addresses),
- honor the orchestrator's deadlines and idempotency contract.

The orchestrator, environment service, and routes will not change when this
provider is wired in.
