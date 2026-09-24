/**
 * FUTURE BACKEND CONTRACT — challenge sandbox environments.
 *
 * Mirrors the API's challenge-environment lifecycle (apps/api Phase 11) so the
 * UI can adopt a real backend later without changing consumers. It provisions
 * NOTHING itself. Per the CYVANTAS security model the frontend is never the
 * vulnerable target: no remote shells, no arbitrary command execution, no live
 * exploit endpoints, no arbitrary target URLs.
 *
 * The API's runtime seam is the "not configured" provider in this build, so an
 * environment never becomes live. The honest local stub below reflects that:
 * `supportsProvisioning` is false and every environment reports
 * `not-provisioned`. Consumers MUST branch on `supportsProvisioning` before
 * offering any "launch" affordance, and must never fake a running target.
 */

export type ChallengeEnvironmentStatus =
  | "not-provisioned"
  | "provisioning"
  | "ready"
  | "expired"
  | "error"

/**
 * Safe view a real, isolated environment would expose. `accessUrl` would point
 * at a sandboxed, per-user instance — never a shared or public target. It maps
 * to the API's ChallengeEnvironmentView (environmentId/status/serviceUrl).
 */
export interface ChallengeEnvironment {
  environmentId: string
  challengeSlug: string
  status: ChallengeEnvironmentStatus
  /** True only when a real runtime is configured server-side. */
  runtimeConfigured: boolean
  /** ISO-8601 expiry; environments are ephemeral and auto-torn-down. */
  expiresAt: string | null
  /** URL of the isolated sandbox instance (null until provisioned). */
  accessUrl: string | null
}

/**
 * Provisioning contract a backend will implement later. DO NOT implement real
 * provisioning in the frontend.
 */
export interface ChallengeEnvironmentProvider {
  /** Whether real, isolated environments can be provisioned. False for now. */
  readonly supportsProvisioning: boolean
  provision(challengeSlug: string): Promise<ChallengeEnvironment>
  getEnvironment(challengeSlug: string): Promise<ChallengeEnvironment | undefined>
  reset(challengeSlug: string): Promise<void>
  destroy(challengeSlug: string): Promise<void>
}

function unprovisioned(challengeSlug: string): ChallengeEnvironment {
  return {
    environmentId: "",
    challengeSlug,
    status: "not-provisioned",
    runtimeConfigured: false,
    expiresAt: null,
    accessUrl: null,
  }
}

/**
 * Honest stub. Provisions nothing and always reports `not-provisioned`.
 * Mutating methods are inert until isolated environments exist.
 */
export const localChallengeEnvironmentProvider: ChallengeEnvironmentProvider = {
  supportsProvisioning: false,

  async provision(challengeSlug) {
    return unprovisioned(challengeSlug)
  },

  async getEnvironment(challengeSlug) {
    return unprovisioned(challengeSlug)
  },

  async reset() {
    /* no-op until isolated environments exist */
  },

  async destroy() {
    /* no-op until isolated environments exist */
  },
}

/** Active provider. Swap for a sandbox-backed implementation in a later phase. */
export const challengeEnvironmentProvider = localChallengeEnvironmentProvider
