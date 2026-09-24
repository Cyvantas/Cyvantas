/**
 * Challenge service (Phase 11) — the single place challenge-environment and
 * flag-submission business logic lives. Route handlers stay thin.
 *
 * SECURITY / HONESTY GUARANTEES:
 *   - It executes NOTHING itself: no shell, no child process, no Docker, no
 *     sockets, no host filesystem. Environment provisioning is delegated to the
 *     existing environmentService, which uses the injected runtime-provider
 *     seam (the not-configured provider in this build).
 *   - It NEVER fakes a live sandbox. When no runtime is configured, the returned
 *     view reports runtimeConfigured=false and the environment is left in its
 *     control-plane state (REQUESTED) — it never claims READY/ACTIVE.
 *   - Ownership is enforced upstream by environmentService.getEnvironment (404
 *     for a non-owned id). This service additionally binds an environment to the
 *     requested challenge (association check).
 *   - Flag verification is server-authoritative and returns ONLY a boolean. The
 *     flag is never returned, never placed in a DTO, and never written to audit.
 *
 * It reuses the existing EnvironmentRuntimeProvider seam via environmentService
 * and introduces no second runtime abstraction.
 */
import type { AuthContext } from "./authService.ts"
import type { EnvironmentActor, EnvironmentService } from "./environmentService.ts"
import type { AuditRepository, ProgressRepository } from "../repositories/types.ts"
import type { AuditEventName } from "../repositories/types.ts"
import type {
  ChallengeDefinition,
  ChallengeEnvironmentView,
  ChallengeResult,
  ChallengeSubmission,
} from "../challenges/challengeTypes.ts"
import type { EnvironmentRecord } from "../domain/environment.ts"
import { badRequest, conflict, notFound } from "../types/api.ts"

interface ChallengeCatalog {
  challengeSupportsEnvironment(slug: string): boolean
}

export interface ChallengeServiceDeps {
  environments: EnvironmentService
  catalog: ChallengeCatalog
  registry: Map<string, ChallengeDefinition>
  audit: AuditRepository
  progress: ProgressRepository
  now?: () => Date
}

export interface ChallengeEnvironmentOptions {
  idempotencyKey?: string | null
  ctx?: AuthContext
}

/** Max accepted answer length. Bounds work and blunts oversized-payload abuse. */
const MAX_ANSWER_LENGTH = 512

export interface ChallengeService {
  runtimeConfigured: boolean
  createEnvironment(
    actor: EnvironmentActor,
    slug: string,
    options?: ChallengeEnvironmentOptions,
  ): Promise<ChallengeEnvironmentView>
  getEnvironment(
    actor: EnvironmentActor,
    slug: string,
    environmentId: string,
  ): Promise<ChallengeEnvironmentView>
  resetEnvironment(
    actor: EnvironmentActor,
    slug: string,
    environmentId: string,
    ctx?: AuthContext,
  ): Promise<ChallengeEnvironmentView>
  submit(
    actor: EnvironmentActor,
    slug: string,
    submission: ChallengeSubmission,
    ctx?: AuthContext,
  ): Promise<ChallengeResult>
}

export function createChallengeService(
  deps: ChallengeServiceDeps,
): ChallengeService {
  const { environments, catalog, registry, audit, progress } = deps
  const now = deps.now ?? (() => new Date())
  const runtimeConfigured = environments.runtimeConfigured

  async function record(
    event: AuditEventName,
    userId: string,
    ctx?: AuthContext,
  ): Promise<void> {
    await audit.record({
      event,
      userId,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    })
  }

  function requireDefinition(slug: string): ChallengeDefinition {
    const def = registry.get(slug)
    if (!def || !catalog.challengeSupportsEnvironment(slug)) {
      throw notFound("CHALLENGE_NOT_FOUND", "Challenge not found.")
    }
    return def
  }

  /** Build the safe view. Never leaks userId/metadata/flag/host internals. */
  function toView(env: EnvironmentRecord): ChallengeEnvironmentView {
    const view: ChallengeEnvironmentView = {
      environmentId: env.id,
      challengeSlug: env.challengeSlug ?? "",
      status: env.status,
      runtimeStatus: env.runtimeStatus,
      runtimeConfigured,
      createdAt: env.createdAt.toISOString(),
      expiresAt: env.expiresAt.toISOString(),
      lastActivityAt: env.lastActivityAt.toISOString(),
      // No runtime is configured, so there is never a reachable target URL. A
      // real runtime would populate this from provider metadata, never a guess.
      serviceUrl: null,
    }
    if (env.status === "FAILED" && env.failureCode) {
      view.failureCode = env.failureCode
    }
    return view
  }

  /**
   * Load an owned environment and bind it to this challenge. Ownership 404 comes
   * from environmentService; a slug/type mismatch is a distinct 400 so a client
   * cannot submit against an environment provisioned for a different challenge.
   */
  async function loadForChallenge(
    actor: EnvironmentActor,
    slug: string,
    environmentId: string,
  ): Promise<EnvironmentRecord> {
    const env = await environments.getEnvironment(actor, environmentId)
    if (env.type !== "CHALLENGE" || env.challengeSlug !== slug) {
      throw badRequest(
        "ENVIRONMENT_CHALLENGE_MISMATCH",
        "Environment is not associated with this challenge.",
      )
    }
    return env
  }

  return {
    runtimeConfigured,

    async createEnvironment(actor, slug, options): Promise<ChallengeEnvironmentView> {
      requireDefinition(slug)
      await record("CHALLENGE_ENVIRONMENT_REQUESTED", actor.id, options?.ctx)

      // Reuse the environment service for ownership/limits/TTL/idempotency and
      // the state machine. It creates a REQUESTED control-plane record without
      // provisioning any runtime.
      let env = await environments.requestEnvironment(
        actor,
        { type: "CHALLENGE", challengeSlug: slug, missionSlug: null },
        { idempotencyKey: options?.idempotencyKey ?? null, ctx: options?.ctx },
      )

      // Only when a real runtime is configured do we walk the lifecycle toward a
      // usable state. With the not-configured provider we intentionally do NOT —
      // the environment stays REQUESTED and the view honestly reports that no
      // runtime is available. We never fabricate READY.
      if (runtimeConfigured && env.status === "REQUESTED") {
        env = await environments.activateEnvironment(actor, env.id, options?.ctx)
        await record("CHALLENGE_ENVIRONMENT_READY", actor.id, options?.ctx)
      }

      return toView(env)
    },

    async getEnvironment(actor, slug, environmentId): Promise<ChallengeEnvironmentView> {
      requireDefinition(slug)
      const env = await loadForChallenge(actor, slug, environmentId)
      return toView(env)
    },

    async resetEnvironment(actor, slug, environmentId, ctx): Promise<ChallengeEnvironmentView> {
      requireDefinition(slug)
      // Association check before mutating.
      await loadForChallenge(actor, slug, environmentId)
      const env = await environments.resetEnvironment(actor, environmentId, ctx)
      await record("CHALLENGE_ENVIRONMENT_RESET", actor.id, ctx)
      return toView(env)
    },

    async submit(actor, slug, submission, ctx): Promise<ChallengeResult> {
      const def = requireDefinition(slug)

      // Validate submission shape server-side. Never echo the value back.
      const answer =
        typeof submission.answer === "string" ? submission.answer.trim() : ""
      if (answer.length === 0 || answer.length > MAX_ANSWER_LENGTH) {
        throw badRequest("INVALID_SUBMISSION", "Submission is not valid.")
      }
      if (
        typeof submission.environmentId !== "string" ||
        submission.environmentId.trim() === ""
      ) {
        throw badRequest("INVALID_SUBMISSION", "Submission is not valid.")
      }

      // Ownership + association. 404 for a non-owned id; 400 for a mismatch.
      const env = await loadForChallenge(actor, slug, submission.environmentId)

      // Acceptable state: not torn down, not failed, not expired. A control-plane
      // record (REQUESTED/READY/ACTIVE) is acceptable so verification works even
      // before a runtime exists.
      if (
        env.status === "DESTROYED" ||
        env.status === "DESTROYING" ||
        env.status === "FAILED"
      ) {
        throw conflict(
          "ENVIRONMENT_INVALID_STATE",
          "Environment cannot accept a submission in its current state.",
        )
      }
      if (env.expiresAt.getTime() <= now().getTime()) {
        throw conflict("ENVIRONMENT_EXPIRED", "Environment has expired.")
      }

      const correct = def.verifier.verify({ slug, environment: env }, answer)

      if (correct) {
        await record("CHALLENGE_SUBMISSION_ACCEPTED", actor.id, ctx)
        // Record completion via the existing progress store. This is a single
        // record, not a scoring/leaderboard engine (out of Phase 11 scope).
        await progress.upsert("challenge", {
          userId: actor.id,
          slug,
          status: "completed",
          completedAt: now(),
        })
      } else {
        await record("CHALLENGE_SUBMISSION_REJECTED", actor.id, ctx)
      }

      // The ONLY thing returned. No flag, no reason, no partial-match signal.
      return { correct }
    },
  }
}
