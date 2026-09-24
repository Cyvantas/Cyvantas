/**
 * Server-authoritative sandbox policy engine (Phase 10).
 *
 * PURE, no I/O. Given a client-proposed (untrusted) policy, it merges the
 * proposal over conservative defaults and validates the result against fixed
 * server maximums and hard security rules. It NEVER silently increases a limit:
 * an out-of-range or unsafe value is REJECTED with a non-sensitive reason code.
 *
 * Trust model: the sandbox is an untrusted execution boundary. Defaults are
 * deny/deny/off. Dangerous capabilities (privileged, host filesystem, device
 * access, raw sockets) and unsafe network destinations (loopback, link-local,
 * private, cloud-metadata, unix sockets, wildcards) are rejected — this is the
 * primary SSRF / escape defense implemented now, ahead of any real runtime.
 */
import type {
  PolicyRejectionReason,
  PolicyResolution,
  SandboxCapabilityPolicy,
  SandboxFilesystemPolicy,
  SandboxNetworkPolicy,
  SandboxPolicy,
  SandboxProvisionRequest,
  SandboxResourcePolicy,
} from "./sandboxTypes.ts"

/** Fixed server maximums. A client may request tighter values, never larger. */
export const SANDBOX_MAX_LIMITS = {
  cpuMillis: 2000, // 2 vCPU
  memoryMb: 1024,
  diskMb: 2048,
  pids: 256,
  maxLifetimeSeconds: 60 * 60, // 1 hour hard ceiling
  idleTimeoutSeconds: 30 * 60, // 30 minutes
} as const

/** Conservative, safe-by-default policy. Deny network, deny caps, read-only fs. */
export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  resources: {
    cpuMillis: 500,
    memoryMb: 256,
    diskMb: 512,
    pids: 64,
    maxLifetimeSeconds: 15 * 60,
    idleTimeoutSeconds: 5 * 60,
  },
  network: {
    ingress: "deny",
    egress: "deny",
    allowedDestinations: [],
  },
  capabilities: {
    allowNetwork: false,
    allowOutboundHttp: false,
    allowOutboundDns: false,
    allowRawSockets: false,
    allowPrivileged: false,
    allowHostFilesystem: false,
    allowDeviceAccess: false,
  },
  filesystem: {
    readOnlyRootFilesystem: true,
    allowHostMounts: false,
    writablePaths: ["/tmp/sandbox"],
  },
}

// ---------------------------------------------------------------------------
// Network destination classification (SSRF defense).
// ---------------------------------------------------------------------------

// Route-everything wildcards. The bare unspecified addresses 0.0.0.0 and :: are
// intentionally NOT here — they classify as FORBIDDEN_DESTINATION_UNSPECIFIED.
const WILDCARD_DESTINATIONS = new Set([
  "*",
  "any",
  "all",
  "0.0.0.0/0",
  "::/0",
])

const METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
])

const INTERNAL_SUFFIXES = [".internal", ".local", ".localdomain", ".cluster.local"]

/** Extracts a bare host from a URL, `host:port`, or bare host string. */
function extractHost(raw: string): string | null {
  let value = raw.trim().toLowerCase()
  if (value === "") return null
  // Reject unix sockets outright (handled by caller, but guard here too).
  if (value.startsWith("unix:") || value.startsWith("/")) return null
  // Strip scheme.
  const schemeIdx = value.indexOf("://")
  if (schemeIdx !== -1) value = value.slice(schemeIdx + 3)
  // Strip any path/query/fragment.
  value = value.split(/[/?#]/)[0] ?? value
  if (value === "") return null
  // Bracketed IPv6 [::1]:443 → ::1
  if (value.startsWith("[")) {
    const end = value.indexOf("]")
    if (end === -1) return null
    return value.slice(1, end)
  }
  // Strip :port only for hostnames / IPv4 (IPv6 without brackets is ambiguous;
  // if it contains multiple colons treat the whole thing as an IPv6 literal).
  const colonCount = (value.match(/:/g) ?? []).length
  if (colonCount === 1) value = value.split(":")[0] ?? value
  return value === "" ? null : value
}

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".")
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n < 0 || n > 255) return null
    octets.push(n)
  }
  return octets
}

/** Classifies a destination; returns a rejection reason or null if allowed. */
export function classifyDestination(raw: string): PolicyRejectionReason | null {
  const trimmed = raw.trim().toLowerCase()
  if (trimmed === "") return "FORBIDDEN_DESTINATION_MALFORMED"
  if (trimmed.startsWith("unix:") || trimmed.startsWith("/")) {
    return "FORBIDDEN_DESTINATION_UNIX_SOCKET"
  }
  if (WILDCARD_DESTINATIONS.has(trimmed)) {
    return "UNRESTRICTED_EGRESS_NOT_ALLOWED"
  }
  const host = extractHost(trimmed)
  if (host === null) return "FORBIDDEN_DESTINATION_MALFORMED"
  if (WILDCARD_DESTINATIONS.has(host)) return "UNRESTRICTED_EGRESS_NOT_ALLOWED"
  if (METADATA_HOSTS.has(host)) return "FORBIDDEN_DESTINATION_METADATA"
  if (host === "localhost" || host.endsWith(".localhost")) {
    return "FORBIDDEN_DESTINATION_LOOPBACK"
  }
  if (INTERNAL_SUFFIXES.some((s) => host.endsWith(s))) {
    return "FORBIDDEN_DESTINATION_INTERNAL"
  }

  // IPv6 literals.
  if (host.includes(":")) {
    if (host === "::1") return "FORBIDDEN_DESTINATION_LOOPBACK"
    if (host === "::" ) return "FORBIDDEN_DESTINATION_UNSPECIFIED"
    if (host.startsWith("fe80") || host.startsWith("fe9") ||
        host.startsWith("fea") || host.startsWith("feb")) {
      return "FORBIDDEN_DESTINATION_LINK_LOCAL"
    }
    if (host.startsWith("fc") || host.startsWith("fd")) {
      return "FORBIDDEN_DESTINATION_PRIVATE" // unique-local fc00::/7
    }
    // IPv4-mapped ::ffff:127.0.0.1 etc.
    const mapped = host.split(":").pop() ?? ""
    if (mapped.includes(".")) {
      const octets = parseIpv4(mapped)
      if (octets) return classifyIpv4(octets)
    }
    return null
  }

  // IPv4 literals.
  const octets = parseIpv4(host)
  if (octets) return classifyIpv4(octets)

  // A plain hostname with at least one dot is allowed (validated further by a
  // real provider at connect time). A bare single-label hostname is treated as
  // internal to avoid resolving to a search-domain internal host.
  if (!host.includes(".")) return "FORBIDDEN_DESTINATION_INTERNAL"
  return null
}

function classifyIpv4(o: number[]): PolicyRejectionReason | null {
  const [a, b] = o as [number, number, number, number]
  if (a === 127) return "FORBIDDEN_DESTINATION_LOOPBACK"
  if (a === 0) return "FORBIDDEN_DESTINATION_UNSPECIFIED"
  if (a === 169 && b === 254) {
    // 169.254.169.254 metadata handled by host set; the /16 is link-local.
    return "FORBIDDEN_DESTINATION_LINK_LOCAL"
  }
  if (a === 10) return "FORBIDDEN_DESTINATION_PRIVATE"
  if (a === 172 && b >= 16 && b <= 31) return "FORBIDDEN_DESTINATION_PRIVATE"
  if (a === 192 && b === 168) return "FORBIDDEN_DESTINATION_PRIVATE"
  if (a === 100 && b >= 64 && b <= 127) return "FORBIDDEN_DESTINATION_PRIVATE" // CGNAT
  return null
}

// ---------------------------------------------------------------------------
// Field resolution / validation.
// ---------------------------------------------------------------------------

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && Number.isFinite(v)
}

function resolveResources(
  req: Partial<SandboxResourcePolicy> | undefined,
  reasons: PolicyRejectionReason[],
): SandboxResourcePolicy {
  const d = DEFAULT_SANDBOX_POLICY.resources
  const max = SANDBOX_MAX_LIMITS

  function pick(
    value: number | undefined,
    fallback: number,
    ceiling: number,
    invalid: PolicyRejectionReason,
    exceeded: PolicyRejectionReason,
  ): number {
    if (value === undefined) return fallback
    if (!isPositiveInt(value)) {
      reasons.push(invalid)
      return fallback
    }
    if (value > ceiling) {
      reasons.push(exceeded)
      return fallback
    }
    return value
  }

  return {
    cpuMillis: pick(req?.cpuMillis, d.cpuMillis, max.cpuMillis, "CPU_LIMIT_INVALID", "CPU_LIMIT_EXCEEDED"),
    memoryMb: pick(req?.memoryMb, d.memoryMb, max.memoryMb, "MEMORY_LIMIT_INVALID", "MEMORY_LIMIT_EXCEEDED"),
    diskMb: pick(req?.diskMb, d.diskMb, max.diskMb, "DISK_LIMIT_INVALID", "DISK_LIMIT_EXCEEDED"),
    pids: pick(req?.pids, d.pids, max.pids, "PID_LIMIT_INVALID", "PID_LIMIT_EXCEEDED"),
    maxLifetimeSeconds: pick(
      req?.maxLifetimeSeconds, d.maxLifetimeSeconds, max.maxLifetimeSeconds,
      "LIFETIME_INVALID", "LIFETIME_EXCEEDED",
    ),
    idleTimeoutSeconds: pick(
      req?.idleTimeoutSeconds, d.idleTimeoutSeconds, max.idleTimeoutSeconds,
      "IDLE_TIMEOUT_INVALID", "IDLE_TIMEOUT_EXCEEDED",
    ),
  }
}

function resolveCapabilities(
  req: Partial<SandboxCapabilityPolicy> | undefined,
  reasons: PolicyRejectionReason[],
): SandboxCapabilityPolicy {
  // Dangerous capabilities are hard-denied: requesting them is a rejection,
  // never a silent downgrade.
  if (req?.allowPrivileged === true) reasons.push("PRIVILEGED_NOT_ALLOWED")
  if (req?.allowHostFilesystem === true) reasons.push("HOST_FILESYSTEM_NOT_ALLOWED")
  if (req?.allowDeviceAccess === true) reasons.push("DEVICE_ACCESS_NOT_ALLOWED")
  if (req?.allowRawSockets === true) reasons.push("RAW_SOCKETS_NOT_ALLOWED")

  const allowNetwork = req?.allowNetwork === true
  return {
    allowNetwork,
    // Outbound sub-capabilities require the network capability.
    allowOutboundHttp: allowNetwork && req?.allowOutboundHttp === true,
    allowOutboundDns: allowNetwork && req?.allowOutboundDns === true,
    allowRawSockets: false,
    allowPrivileged: false,
    allowHostFilesystem: false,
    allowDeviceAccess: false,
  }
}

function resolveNetwork(
  req: SandboxProvisionRequest["network"],
  caps: SandboxCapabilityPolicy,
  reasons: PolicyRejectionReason[],
): SandboxNetworkPolicy {
  const ingress = req?.ingress ?? DEFAULT_SANDBOX_POLICY.network.ingress
  if (ingress === "controlled") {
    // Ingress into a sandbox is never opened by a public client in Phase 10.
    reasons.push("NETWORK_INGRESS_NOT_ALLOWED")
  }
  const egress = req?.egress ?? DEFAULT_SANDBOX_POLICY.network.egress
  const requested = req?.allowedDestinations ?? []

  if (egress === "allowlist") {
    if (!caps.allowNetwork) reasons.push("NETWORK_CAPABILITY_REQUIRED")
    for (const dest of requested) {
      const reason = classifyDestination(dest)
      if (reason) reasons.push(reason)
    }
  } else if (requested.length > 0) {
    // Destinations only make sense with an allowlist egress mode.
    reasons.push("UNRESTRICTED_EGRESS_NOT_ALLOWED")
  }

  return {
    ingress: "deny",
    egress: egress === "allowlist" ? "allowlist" : "deny",
    allowedDestinations: egress === "allowlist" ? [...requested] : [],
  }
}

function resolveFilesystem(
  req: SandboxProvisionRequest["filesystem"],
  reasons: PolicyRejectionReason[],
): SandboxFilesystemPolicy {
  if (req?.allowHostMounts === true) reasons.push("HOST_MOUNTS_NOT_ALLOWED")
  if (req?.readOnlyRootFilesystem === false) reasons.push("READONLY_ROOT_REQUIRED")
  return {
    readOnlyRootFilesystem: true,
    allowHostMounts: false,
    writablePaths: [...DEFAULT_SANDBOX_POLICY.filesystem.writablePaths],
  }
}

/**
 * Resolve + validate a client-proposed policy against server rules. Returns the
 * safe, fully-resolved policy, or a list of non-sensitive rejection reasons.
 * With no request it returns the conservative default policy.
 */
export function resolveSandboxPolicy(
  request: SandboxProvisionRequest = {},
): PolicyResolution {
  const reasons: PolicyRejectionReason[] = []
  const resources = resolveResources(request.resources, reasons)
  const capabilities = resolveCapabilities(request.capabilities, reasons)
  const network = resolveNetwork(request.network, capabilities, reasons)
  const filesystem = resolveFilesystem(request.filesystem, reasons)

  if (reasons.length > 0) return { ok: false, reasons }
  return { ok: true, policy: { resources, network, capabilities, filesystem } }
}
