/**
 * Sandbox orchestration types (Phase 10).
 *
 * These describe the CONTRACT and POLICY MODEL for isolated challenge sandboxes.
 * Phase 10 defines the abstraction and enforces policy; it provisions NO real
 * container/process/namespace. The production runtime implements the existing
 * `EnvironmentRuntimeProvider` seam later, without changing these types.
 *
 * Defined as const unions (not TS enums) to satisfy `erasableSyntaxOnly`.
 *
 * SECURITY: everything here treats the sandbox as an UNTRUSTED execution
 * boundary. Defaults are deny/deny/off; the policy engine (sandboxPolicy.ts) is
 * server-authoritative and rejects unsafe values rather than clamping them.
 */

/** Ingress: never open by default; `controlled` = a future provider-mediated path. */
export const NETWORK_INGRESS_MODES = ["deny", "controlled"] as const
export type NetworkIngressMode = (typeof NETWORK_INGRESS_MODES)[number]

/** Egress: default-deny; `allowlist` = only explicitly validated destinations. */
export const NETWORK_EGRESS_MODES = ["deny", "allowlist"] as const
export type NetworkEgressMode = (typeof NETWORK_EGRESS_MODES)[number]

/**
 * Server-authoritative resource limits. All values are finite positive integers
 * below server maximums; the policy engine rejects anything outside that range.
 */
export interface SandboxResourcePolicy {
  cpuMillis: number
  memoryMb: number
  diskMb: number
  pids: number
  maxLifetimeSeconds: number
  idleTimeoutSeconds: number
}

/**
 * Explicit default-deny network policy. `allowedDestinations` is only meaningful
 * when `egress === "allowlist"`, and every entry is validated server-side to
 * reject loopback/link-local/private/metadata/unix-socket/wildcard targets
 * (SSRF defense).
 */
export interface SandboxNetworkPolicy {
  ingress: NetworkIngressMode
  egress: NetworkEgressMode
  allowedDestinations: readonly string[]
}

/**
 * Capability model. Default is deny for everything. Dangerous capabilities
 * (privileged, host filesystem, device access, raw sockets) must remain false
 * and are rejected if a public client requests them.
 */
export interface SandboxCapabilityPolicy {
  allowNetwork: boolean
  allowOutboundHttp: boolean
  allowOutboundDns: boolean
  allowRawSockets: boolean
  allowPrivileged: boolean
  allowHostFilesystem: boolean
  allowDeviceAccess: boolean
}

/** Filesystem policy. Root is read-only; host mounts are never permitted. */
export interface SandboxFilesystemPolicy {
  readOnlyRootFilesystem: boolean
  allowHostMounts: boolean
  /** In-sandbox writable paths (e.g. an ephemeral scratch dir). Never host paths. */
  writablePaths: readonly string[]
}

/** The fully-resolved, server-authoritative sandbox policy. */
export interface SandboxPolicy {
  resources: SandboxResourcePolicy
  network: SandboxNetworkPolicy
  capabilities: SandboxCapabilityPolicy
  filesystem: SandboxFilesystemPolicy
}

/**
 * A client-PROPOSED policy. Every field is optional and untrusted; the policy
 * engine merges it over conservative defaults and validates the result. Clients
 * can only ever REQUEST tighter or equal limits — never exceed server maximums.
 */
export interface SandboxProvisionRequest {
  resources?: Partial<SandboxResourcePolicy>
  network?: Partial<Omit<SandboxNetworkPolicy, "allowedDestinations">> & {
    allowedDestinations?: readonly string[]
  }
  capabilities?: Partial<SandboxCapabilityPolicy>
  filesystem?: Partial<Omit<SandboxFilesystemPolicy, "writablePaths">> & {
    writablePaths?: readonly string[]
  }
}

/**
 * A single, machine-readable, NON-SENSITIVE reason a policy was rejected. Safe
 * to surface for debugging (it names a limit, never a value or internal detail).
 */
export const POLICY_REJECTION_REASONS = [
  "CPU_LIMIT_EXCEEDED",
  "CPU_LIMIT_INVALID",
  "MEMORY_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_INVALID",
  "DISK_LIMIT_EXCEEDED",
  "DISK_LIMIT_INVALID",
  "PID_LIMIT_EXCEEDED",
  "PID_LIMIT_INVALID",
  "LIFETIME_EXCEEDED",
  "LIFETIME_INVALID",
  "IDLE_TIMEOUT_INVALID",
  "IDLE_TIMEOUT_EXCEEDED",
  "PRIVILEGED_NOT_ALLOWED",
  "HOST_FILESYSTEM_NOT_ALLOWED",
  "DEVICE_ACCESS_NOT_ALLOWED",
  "RAW_SOCKETS_NOT_ALLOWED",
  "HOST_MOUNTS_NOT_ALLOWED",
  "READONLY_ROOT_REQUIRED",
  "NETWORK_INGRESS_NOT_ALLOWED",
  "NETWORK_CAPABILITY_REQUIRED",
  "UNRESTRICTED_EGRESS_NOT_ALLOWED",
  "FORBIDDEN_DESTINATION_LOOPBACK",
  "FORBIDDEN_DESTINATION_LINK_LOCAL",
  "FORBIDDEN_DESTINATION_PRIVATE",
  "FORBIDDEN_DESTINATION_METADATA",
  "FORBIDDEN_DESTINATION_UNIX_SOCKET",
  "FORBIDDEN_DESTINATION_INTERNAL",
  "FORBIDDEN_DESTINATION_UNSPECIFIED",
  "FORBIDDEN_DESTINATION_MALFORMED",
] as const
export type PolicyRejectionReason = (typeof POLICY_REJECTION_REASONS)[number]

/** Discriminated result of resolving a proposed policy against server rules. */
export type PolicyResolution =
  | { ok: true; policy: SandboxPolicy }
  | { ok: false; reasons: PolicyRejectionReason[] }

/**
 * SAFE, public sandbox descriptor. Deliberately whitelists only shippable
 * fields. NEVER exposes runtime ids, internal hostnames, node addresses,
 * internal IPs, filesystem paths, container ids, provider credentials/metadata,
 * or stack traces. `runtimeAvailable` is honest: false whenever no runtime
 * provider is configured.
 */
export interface SandboxDescriptorDTO {
  environmentId: string
  /** Honest runtime signal — false in Phase 10 (no runtime provider wired). */
  runtimeAvailable: boolean
  policy: {
    resources: SandboxResourcePolicy
    network: {
      ingress: NetworkIngressMode
      egress: NetworkEgressMode
      allowedDestinationCount: number
    }
    capabilities: SandboxCapabilityPolicy
    filesystem: {
      readOnlyRootFilesystem: boolean
      allowHostMounts: boolean
      writablePathCount: number
    }
  }
}

/** Sandbox audit event names — a subset of the global AuditEvent enum. */
export const SANDBOX_AUDIT_EVENTS = [
  "SANDBOX_PROVISION_REQUESTED",
  "SANDBOX_PROVISION_REJECTED",
  "SANDBOX_PROVISION_STARTED",
  "SANDBOX_READY",
  "SANDBOX_START_REQUESTED",
  "SANDBOX_STARTED",
  "SANDBOX_STOP_REQUESTED",
  "SANDBOX_STOPPED",
  "SANDBOX_RESET_REQUESTED",
  "SANDBOX_RESET",
  "SANDBOX_DESTROY_REQUESTED",
  "SANDBOX_DESTROYED",
  "SANDBOX_RUNTIME_UNAVAILABLE",
  "SANDBOX_POLICY_REJECTED",
  "SANDBOX_TIMEOUT",
] as const
export type SandboxAuditEvent = (typeof SANDBOX_AUDIT_EVENTS)[number]
