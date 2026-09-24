import { describe, it, expect } from "vitest"
import {
  resolveSandboxPolicy,
  classifyDestination,
  DEFAULT_SANDBOX_POLICY,
  SANDBOX_MAX_LIMITS,
} from "../src/orchestration/sandboxPolicy.ts"

describe("resolveSandboxPolicy — safe defaults", () => {
  it("returns the conservative default policy for an empty request", () => {
    const res = resolveSandboxPolicy({})
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.policy.network.ingress).toBe("deny")
    expect(res.policy.network.egress).toBe("deny")
    expect(res.policy.network.allowedDestinations).toEqual([])
    expect(res.policy.capabilities).toEqual(DEFAULT_SANDBOX_POLICY.capabilities)
    expect(res.policy.filesystem.readOnlyRootFilesystem).toBe(true)
    expect(res.policy.filesystem.allowHostMounts).toBe(false)
  })

  it("accepts tighter (smaller) resource limits", () => {
    const res = resolveSandboxPolicy({ resources: { memoryMb: 128, cpuMillis: 250 } })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.policy.resources.memoryMb).toBe(128)
      expect(res.policy.resources.cpuMillis).toBe(250)
    }
  })
})

describe("resolveSandboxPolicy — resource validation (never clamps, rejects)", () => {
  it("rejects CPU above the server maximum", () => {
    const res = resolveSandboxPolicy({ resources: { cpuMillis: SANDBOX_MAX_LIMITS.cpuMillis + 1 } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("CPU_LIMIT_EXCEEDED")
  })
  it("rejects memory above the maximum", () => {
    const res = resolveSandboxPolicy({ resources: { memoryMb: 999_999 } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("MEMORY_LIMIT_EXCEEDED")
  })
  it("rejects disk above the maximum", () => {
    const res = resolveSandboxPolicy({ resources: { diskMb: 999_999 } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("DISK_LIMIT_EXCEEDED")
  })
  it("rejects process count above the maximum", () => {
    const res = resolveSandboxPolicy({ resources: { pids: 100_000 } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("PID_LIMIT_EXCEEDED")
  })
  it("rejects an excessive lifetime", () => {
    const res = resolveSandboxPolicy({ resources: { maxLifetimeSeconds: 10 * 60 * 60 } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("LIFETIME_EXCEEDED")
  })
  it("rejects non-integer / non-positive / infinite values", () => {
    for (const bad of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN]) {
      const res = resolveSandboxPolicy({ resources: { cpuMillis: bad } })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.reasons).toContain("CPU_LIMIT_INVALID")
    }
  })
})

describe("resolveSandboxPolicy — capability validation (default deny)", () => {
  it("rejects a privileged request", () => {
    const res = resolveSandboxPolicy({ capabilities: { allowPrivileged: true } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("PRIVILEGED_NOT_ALLOWED")
  })
  it("rejects host filesystem access", () => {
    const res = resolveSandboxPolicy({ capabilities: { allowHostFilesystem: true } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("HOST_FILESYSTEM_NOT_ALLOWED")
  })
  it("rejects device access and raw sockets", () => {
    const res = resolveSandboxPolicy({
      capabilities: { allowDeviceAccess: true, allowRawSockets: true },
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.reasons).toContain("DEVICE_ACCESS_NOT_ALLOWED")
      expect(res.reasons).toContain("RAW_SOCKETS_NOT_ALLOWED")
    }
  })
  it("dangerous capabilities remain false even when not requested", () => {
    const res = resolveSandboxPolicy({ capabilities: { allowNetwork: true } })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.policy.capabilities.allowPrivileged).toBe(false)
      expect(res.policy.capabilities.allowHostFilesystem).toBe(false)
      expect(res.policy.capabilities.allowDeviceAccess).toBe(false)
      expect(res.policy.capabilities.allowRawSockets).toBe(false)
    }
  })
})

describe("resolveSandboxPolicy — filesystem", () => {
  it("rejects disabling the read-only root", () => {
    const res = resolveSandboxPolicy({ filesystem: { readOnlyRootFilesystem: false } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("READONLY_ROOT_REQUIRED")
  })
  it("rejects host mounts", () => {
    const res = resolveSandboxPolicy({ filesystem: { allowHostMounts: true } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("HOST_MOUNTS_NOT_ALLOWED")
  })
})

describe("network policy — default deny + SSRF-safe egress allowlist", () => {
  it("defaults to deny/deny", () => {
    const res = resolveSandboxPolicy({})
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.policy.network.ingress).toBe("deny")
      expect(res.policy.network.egress).toBe("deny")
    }
  })
  it("rejects controlled ingress from a public client", () => {
    const res = resolveSandboxPolicy({ network: { ingress: "controlled" } })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("NETWORK_INGRESS_NOT_ALLOWED")
  })
  it("requires the network capability for an egress allowlist", () => {
    const res = resolveSandboxPolicy({
      network: { egress: "allowlist", allowedDestinations: ["example.com"] },
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("NETWORK_CAPABILITY_REQUIRED")
  })
  it("rejects destinations even when the network capability is granted", () => {
    const res = resolveSandboxPolicy({
      capabilities: { allowNetwork: true },
      network: { egress: "allowlist", allowedDestinations: ["127.0.0.1"] },
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("FORBIDDEN_DESTINATION_LOOPBACK")
  })
  it("allows a public host destination with the network capability", () => {
    const res = resolveSandboxPolicy({
      capabilities: { allowNetwork: true },
      network: { egress: "allowlist", allowedDestinations: ["example.com", "8.8.8.8"] },
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.policy.network.allowedDestinations).toHaveLength(2)
  })
  it("rejects supplying destinations without an allowlist egress mode", () => {
    const res = resolveSandboxPolicy({
      capabilities: { allowNetwork: true },
      network: { egress: "deny", allowedDestinations: ["example.com"] },
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reasons).toContain("UNRESTRICTED_EGRESS_NOT_ALLOWED")
  })
})

describe("classifyDestination — SSRF blocklist", () => {
  const cases: Array<[string, string]> = [
    ["localhost", "FORBIDDEN_DESTINATION_LOOPBACK"],
    ["http://localhost:8080/x", "FORBIDDEN_DESTINATION_LOOPBACK"],
    ["127.0.0.1", "FORBIDDEN_DESTINATION_LOOPBACK"],
    ["127.5.5.5", "FORBIDDEN_DESTINATION_LOOPBACK"],
    ["::1", "FORBIDDEN_DESTINATION_LOOPBACK"],
    ["[::1]:443", "FORBIDDEN_DESTINATION_LOOPBACK"],
    ["10.0.0.5", "FORBIDDEN_DESTINATION_PRIVATE"],
    ["172.16.0.1", "FORBIDDEN_DESTINATION_PRIVATE"],
    ["192.168.1.1", "FORBIDDEN_DESTINATION_PRIVATE"],
    ["100.64.0.1", "FORBIDDEN_DESTINATION_PRIVATE"],
    ["fd00::1", "FORBIDDEN_DESTINATION_PRIVATE"],
    ["169.254.0.1", "FORBIDDEN_DESTINATION_LINK_LOCAL"],
    ["fe80::1", "FORBIDDEN_DESTINATION_LINK_LOCAL"],
    ["169.254.169.254", "FORBIDDEN_DESTINATION_METADATA"],
    ["metadata.google.internal", "FORBIDDEN_DESTINATION_METADATA"],
    ["http://169.254.169.254/latest/meta-data/", "FORBIDDEN_DESTINATION_METADATA"],
    ["unix:/var/run/docker.sock", "FORBIDDEN_DESTINATION_UNIX_SOCKET"],
    ["/var/run/docker.sock", "FORBIDDEN_DESTINATION_UNIX_SOCKET"],
    ["0.0.0.0", "FORBIDDEN_DESTINATION_UNSPECIFIED"],
    ["*", "UNRESTRICTED_EGRESS_NOT_ALLOWED"],
    ["0.0.0.0/0", "UNRESTRICTED_EGRESS_NOT_ALLOWED"],
    ["::/0", "UNRESTRICTED_EGRESS_NOT_ALLOWED"],
    ["internal-service", "FORBIDDEN_DESTINATION_INTERNAL"],
    ["db.cluster.local", "FORBIDDEN_DESTINATION_INTERNAL"],
    ["", "FORBIDDEN_DESTINATION_MALFORMED"],
  ]
  for (const [input, reason] of cases) {
    it(`blocks ${JSON.stringify(input)} → ${reason}`, () => {
      expect(classifyDestination(input)).toBe(reason)
    })
  }

  it("allows ordinary public hosts", () => {
    expect(classifyDestination("example.com")).toBeNull()
    expect(classifyDestination("api.github.com")).toBeNull()
    expect(classifyDestination("8.8.8.8")).toBeNull()
    expect(classifyDestination("https://example.com/path")).toBeNull()
  })
})
