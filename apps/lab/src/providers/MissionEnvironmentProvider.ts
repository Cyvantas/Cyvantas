/**
 * FUTURE BACKEND CONTRACT — mission sandbox environments.
 *
 * This file documents the interface an isolated, sandboxed mission environment
 * would implement. It is NOT implemented and provisions nothing. Per the Phase
 * 5 security model, the CYVANTAS frontend is never the vulnerable target:
 *
 *   - No remote shells or arbitrary command execution
 *   - No real exploit endpoints or public vulnerable servers
 *   - No arbitrary target URLs, SSRF infrastructure, or live scanning
 *   - No credential harvesting or persistence mechanisms
 *
 * When real environments are introduced, they must be isolated, provisioned on
 * demand, and torn down — connected here through this contract so the UI does
 * not change. Until then, `localMissionEnvironmentProvider` reports every
 * environment as `not-provisioned` and the UI states this honestly.
 */

export type MissionEnvironmentStatus =
  | "not-provisioned"
  | "provisioning"
  | "ready"
  | "expired"
  | "error"

/**
 * Shape a real, isolated environment would expose. `accessUrl` would point at a
 * sandboxed, per-user instance — never a shared or public target.
 */
export interface MissionEnvironment {
  environmentId: string
  missionId: string
  status: MissionEnvironmentStatus
  /** ISO-8601 expiry; environments are ephemeral and auto-torn-down. */
  expiresAt: string | null
  /** URL of the isolated sandbox instance (null until provisioned). */
  accessUrl: string | null
}

/**
 * The provisioning contract a backend will implement later. DO NOT implement
 * real provisioning in the frontend.
 */
export interface MissionEnvironmentProvider {
  /** Whether real, isolated environments can be provisioned. False for now. */
  readonly supportsProvisioning: boolean
  provision(missionId: string): Promise<MissionEnvironment>
  getEnvironment(missionId: string): Promise<MissionEnvironment | undefined>
  getStatus(missionId: string): Promise<MissionEnvironmentStatus>
  reset(missionId: string): Promise<void>
  destroy(missionId: string): Promise<void>
}

function unprovisioned(missionId: string): MissionEnvironment {
  return {
    environmentId: "",
    missionId,
    status: "not-provisioned",
    expiresAt: null,
    accessUrl: null,
  }
}

/**
 * Honest stub. Provisions nothing and always reports `not-provisioned`.
 * Mutating methods are inert. Consumers must branch on `supportsProvisioning`
 * before offering any "launch environment" affordance.
 */
export const localMissionEnvironmentProvider: MissionEnvironmentProvider = {
  supportsProvisioning: false,

  async provision(missionId) {
    return unprovisioned(missionId)
  },

  async getEnvironment(missionId) {
    return unprovisioned(missionId)
  },

  async getStatus() {
    return "not-provisioned"
  },

  async reset() {
    /* no-op until isolated environments exist */
  },

  async destroy() {
    /* no-op until isolated environments exist */
  },
}

/** Active provider. Swap for a sandbox-backed implementation in a later phase. */
export const missionEnvironmentProvider = localMissionEnvironmentProvider
