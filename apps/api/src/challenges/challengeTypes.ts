/**
 * Challenge-runtime contract (Phase 11).
 *
 * These typed contracts describe how an isolated educational challenge is
 * defined, how its per-user environment is represented, and how a flag
 * submission is verified — all SERVER-SIDE. The vulnerability (e.g. reflected
 * XSS) lives ONLY inside a future challenge runtime, never in the CYVANTAS API
 * or main site.
 *
 * Trust model: everything a client sends is untrusted. The real flag never
 * leaves the server: it is not in any DTO, HTML, JS bundle, catalog/detail
 * response, environment description, or audit log. Verification is done
 * server-side and returns only a boolean.
 *
 * This layer deliberately introduces NO second runtime abstraction. Actual
 * provisioning reuses the existing `EnvironmentRuntimeProvider` seam (wired to
 * the not-configured provider in this build), so nothing here executes a shell,
 * spawns a process, opens a socket, or touches the host filesystem.
 */
import type {
  EnvironmentRecord,
  EnvironmentRuntimeStatus,
  EnvironmentStatus,
} from "../domain/environment.ts"

/**
 * Server-side definition of a challenge. It pairs a catalog slug with a
 * server-authoritative verifier. The verifier holds the flag/secret in a
 * closure; the definition never exposes it.
 */
export interface ChallengeDefinition {
  /** Catalog slug (must match a real Lab catalog challenge). */
  slug: string
  /** Server-side answer verifier. Never depends on client-supplied "how". */
  verifier: ChallengeVerifier
}

/**
 * Context handed to a verifier. Intentionally minimal and non-sensitive: it
 * carries the challenge slug and the owning environment so a future verifier
 * can bind an answer to a specific environment (e.g. an environment-specific
 * flag), without ever trusting client input about how the challenge was solved.
 */
export interface ChallengeVerificationContext {
  slug: string
  environment: EnvironmentRecord
}

/**
 * Server-authoritative answer verifier. `verify` returns only a boolean and
 * must be constant-time with respect to the secret to avoid timing/enumeration
 * leaks. It must NOT throw for a wrong answer (that is a normal `false`).
 */
export interface ChallengeVerifier {
  verify(context: ChallengeVerificationContext, answer: string): boolean
}

/** A client-proposed flag submission. Both fields are untrusted input. */
export interface ChallengeSubmission {
  environmentId: string
  answer: string
}

/** The ONLY thing a submission ever returns to the client. */
export interface ChallengeResult {
  correct: boolean
}

/**
 * Safe, shippable view of a challenge environment. Derived from an
 * EnvironmentRecord — it deliberately omits userId, metadata, failure messages,
 * host ids/paths/addresses, and never carries the flag or verifier secret. A
 * `serviceUrl` is present only when a real runtime provides one (never in this
 * build).
 */
export interface ChallengeEnvironmentView {
  environmentId: string
  challengeSlug: string
  status: EnvironmentStatus
  runtimeStatus: EnvironmentRuntimeStatus
  /** Honest signal: false whenever no real runtime is configured. */
  runtimeConfigured: boolean
  createdAt: string
  expiresAt: string
  lastActivityAt: string
  /** Present only when a runtime exposes a reachable target. Null otherwise. */
  serviceUrl: string | null
  /** Set only when the environment is FAILED. A stable code, never a trace. */
  failureCode?: string
}

/** Detail DTO for a single challenge — safe to expose objectives, never flags. */
export interface PublicChallengeDetail {
  slug: string
  title: string
  description: string
  difficulty: string
  points: number
  category: string
  estimatedMinutes: number
  tags: string[]
  objectives: string[]
}
