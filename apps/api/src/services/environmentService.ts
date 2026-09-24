/**
 * Environment service — the ONLY place environment lifecycle business logic
 * lives. Route handlers stay thin and call these methods; all authorization,
 * ownership, catalog validation, limits, TTL, and state transitions are decided
 * here, server-side. It depends only on interfaces (repositories, catalog,
 * runtime provider), so it is fully testable with the in-memory repositories
 * and an injected clock — no database or runtime required.
 *
 * Phase 9 scope: this NEVER creates a container/sandbox/process. The runtime
 * provider is the "not configured" implementation, so runtimeStatus stays
 * NOT_PROVISIONED and the DTO reports runtimeConfigured=false honestly.
 */
import type { RoleName } from "../domain/roles.ts"
import type { AuthContext } from "./authService.ts"
import type {
  EnvironmentPolicy,
} from "../config/env.ts"
import type { Repositories } from "../repositories/types.ts"
import type { AuditEventName } from "../repositories/types.ts"
import type { IdempotencyStore } from "./idempotencyStore.ts"
import type { EnvironmentRuntimeProvider } from "./runtime/environmentRuntimeProvider.ts"
import {
  LIVE_STATUSES,
  isEnvironmentType,
  type EnvironmentRecord,
  type EnvironmentStatus,
  type EnvironmentType,
} from "../domain/environment.ts"
import { assertTransition } from "../domain/environmentStateMachine.ts"
import { badRequest, conflict, notFound } from "../types/api.ts"

/** Minimal authenticated actor. Always derived from the session, never input. */
export interface EnvironmentActor {
  id: string
  roles: readonly RoleName[]
}

export interface RequestEnvironmentInput {
  type: string
  challengeSlug?: string | null
  missionSlug?: string | null
}

export interface RequestEnvironmentOptions {
  idempotencyKey?: string | null
  ctx?: AuthContext
}

interface CatalogValidator {
  challengeSupportsEnvironment(slug: string): boolean
  missionSupportsEnvironment(slug: string): boolean
}

export interface EnvironmentServiceDeps {
  repositories: Repositories
  catalog: CatalogValidator
  runtime: EnvironmentRuntimeProvider
  policy: EnvironmentPolicy
  idempotency: IdempotencyStore
  now?: () => Date
}

export interface EnvironmentService {
  runtimeConfigured: boolean
  requestEnvironment(
    actor: EnvironmentActor,
    input: RequestEnvironmentInput,
    options?: RequestEnvironmentOptions,
  ): Promise<EnvironmentRecord>
  getEnvironment(
    actor: EnvironmentActor,
    id: string,
  ): Promise<EnvironmentRecord>
  listUserEnvironments(actor: EnvironmentActor): Promise<EnvironmentRecord[]>
  activateEnvironment(
    actor: EnvironmentActor,
    id: string,
    ctx?: AuthContext,
  ): Promise<EnvironmentRecord>
  touchEnvironment(
    actor: EnvironmentActor,
    id: string,
    ctx?: AuthContext,
  ): Promise<EnvironmentRecord>
  resetEnvironment(
    actor: EnvironmentActor,
    id: string,
    ctx?: AuthContext,
  ): Promise<EnvironmentRecord>
  stopEnvironment(
    actor: EnvironmentActor,
    id: string,
    ctx?: AuthContext,
  ): Promise<EnvironmentRecord>
  destroyEnvironment(
    actor: EnvironmentActor,
    id: string,
    ctx?: AuthContext,
  ): Promise<EnvironmentRecord>
  /** SYSTEM-facing: idempotently time an environment out (used by cleanup). */
  timeoutEnvironment(id: string, ctx?: AuthContext): Promise<EnvironmentRecord | null>
  /** SYSTEM-facing: mark an environment FAILED with a stable code. */
  failEnvironment(
    id: string,
    failureCode: string,
    failureMessage: string,
    ctx?: AuthContext,
  ): Promise<EnvironmentRecord | null>
  /** Housekeeping: time out live environments past expiry. Returns count. */
  cleanupExpiredEnvironments(before?: Date): Promise<number>
}

function createEnvironmentService(deps: EnvironmentServiceDeps): EnvironmentService {
  const { repositories: repos, catalog, runtime, policy, idempotency } = deps
  const now = deps.now ?? (() => new Date())

  function isAdmin(actor: EnvironmentActor): boolean {
    return actor.roles.includes("ADMIN")
  }

  async function record(
    event: AuditEventName,
    userId: string | null,
    ctx?: AuthContext,
  ): Promise<void> {
    await repos.audit.record({
      event,
      userId,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    })
  }

  /**
   * Loads an environment enforcing ownership. Returns 404 (not 403) when the
   * environment does not exist OR is owned by another non-admin user, so the
   * API never discloses that a given id exists to a user who cannot see it.
   */
  async function loadOwned(
    actor: EnvironmentActor,
    id: string,
  ): Promise<EnvironmentRecord> {
    const env = await repos.environments.findById(id)
    if (!env) {
      throw notFound("ENVIRONMENT_NOT_FOUND", "Environment not found.")
    }
    if (env.userId !== actor.id && !isAdmin(actor)) {
      throw notFound("ENVIRONMENT_NOT_FOUND", "Environment not found.")
    }
    return env
  }

  /** Absolute-capped sliding expiry: min(now+ttl, createdAt+maxLifetime). */
  function cappedExpiry(at: Date, createdAt: Date): Date {
    const sliding = at.getTime() + policy.ttlMinutes * 60_000
    const hardCap = createdAt.getTime() + policy.maxLifetimeMinutes * 60_000
    return new Date(Math.min(sliding, hardCap))
  }

  function isExpired(env: EnvironmentRecord, at: Date): boolean {
    return env.expiresAt.getTime() <= at.getTime()
  }

  /**
   * Applies a validated status transition (and optional field patch) through
   * the state machine and repository. Throws if the transition is illegal.
   */
  async function transition(
    env: EnvironmentRecord,
    to: EnvironmentStatus,
    patch: Omit<Parameters<typeof repos.environments.update>[1], "status"> = {},
  ): Promise<EnvironmentRecord> {
    assertTransition(env.status, to)
    const updated = await repos.environments.update(env.id, {
      ...patch,
      status: to,
    })
    if (!updated) {
      throw notFound("ENVIRONMENT_NOT_FOUND", "Environment not found.")
    }
    return updated
  }

  return {
    runtimeConfigured: runtime.configured,

    async requestEnvironment(actor, input, options): Promise<EnvironmentRecord> {
      const key = options?.idempotencyKey?.trim() || null
      if (key) {
        const existingId = idempotency.get(actor.id, key)
        if (existingId) {
          const existing = await repos.environments.findById(existingId)
          if (existing && existing.userId === actor.id) return existing
        }
      }

      if (!isEnvironmentType(input.type)) {
        throw badRequest(
          "INVALID_ENVIRONMENT_TARGET",
          "Unknown environment type.",
        )
      }
      const type: EnvironmentType = input.type

      const challengeSlug = input.challengeSlug?.trim() || null
      const missionSlug = input.missionSlug?.trim() || null

      // Exactly one target, matching the declared type.
      if (type === "CHALLENGE") {
        if (!challengeSlug || missionSlug) {
          throw badRequest(
            "INVALID_ENVIRONMENT_TARGET",
            "A CHALLENGE environment requires a challengeSlug and no missionSlug.",
          )
        }
        if (!catalog.challengeSupportsEnvironment(challengeSlug)) {
          throw badRequest(
            "INVALID_ENVIRONMENT_TARGET",
            "Unknown or unsupported challenge.",
          )
        }
      } else {
        if (!missionSlug || challengeSlug) {
          throw badRequest(
            "INVALID_ENVIRONMENT_TARGET",
            "A MISSION environment requires a missionSlug and no challengeSlug.",
          )
        }
        if (!catalog.missionSupportsEnvironment(missionSlug)) {
          throw badRequest(
            "INVALID_ENVIRONMENT_TARGET",
            "Unknown or unsupported mission.",
          )
        }
      }

      // Server-authoritative limits. Live = holding a slot; total = retained.
      const existing = await repos.environments.listByUser(actor.id)
      const liveCount = existing.filter((e) =>
        LIVE_STATUSES.includes(e.status),
      ).length
      const retainedCount = existing.filter(
        (e) => e.status !== "DESTROYED",
      ).length
      if (liveCount >= policy.maxActive) {
        throw conflict(
          "ENVIRONMENT_LIMIT_REACHED",
          "Maximum number of active environments reached.",
        )
      }
      if (retainedCount >= policy.maxTotal) {
        throw conflict(
          "ENVIRONMENT_LIMIT_REACHED",
          "Maximum number of environments reached.",
        )
      }

      const at = now()
      const created = await repos.environments.create({
        userId: actor.id,
        type,
        challengeSlug,
        missionSlug,
        status: "REQUESTED",
        runtimeStatus: "NOT_PROVISIONED",
        requestedAt: at,
        lastActivityAt: at,
        expiresAt: cappedExpiry(at, at),
      })

      if (key) idempotency.set(actor.id, key, created.id)
      await record("ENVIRONMENT_CREATED", actor.id, options?.ctx)
      return created
    },

    async getEnvironment(actor, id): Promise<EnvironmentRecord> {
      return loadOwned(actor, id)
    },

    async listUserEnvironments(actor): Promise<EnvironmentRecord[]> {
      return repos.environments.listByUser(actor.id)
    },

    async activateEnvironment(actor, id, ctx): Promise<EnvironmentRecord> {
      const env = await loadOwned(actor, id)
      const at = now()

      if (env.status === "ACTIVE") return env // idempotent no-op

      if (env.status === "DESTROYED" || env.status === "DESTROYING") {
        throw conflict(
          "ENVIRONMENT_INVALID_STATE",
          "Environment cannot be started from its current state.",
        )
      }
      if (isExpired(env, at)) {
        throw conflict("ENVIRONMENT_EXPIRED", "Environment has expired.")
      }

      let current = env
      await record("ENVIRONMENT_START_REQUESTED", actor.id, ctx)

      if (current.status === "REQUESTED") {
        current = await transition(current, "PROVISIONING", {
          provisioningStartedAt: at,
        })
        const result = await runtime.provision(current)
        current = await transition(current, "READY", {
          runtimeStatus: result.runtimeStatus,
          readyAt: now(),
        })
        await record("ENVIRONMENT_READY", actor.id, ctx)
      } else if (current.status === "PROVISIONING") {
        const result = await runtime.provision(current)
        current = await transition(current, "READY", {
          runtimeStatus: result.runtimeStatus,
          readyAt: now(),
        })
        await record("ENVIRONMENT_READY", actor.id, ctx)
      } else if (
        current.status === "TIMEOUT" ||
        current.status === "RESETTING"
      ) {
        throw conflict(
          "ENVIRONMENT_INVALID_STATE",
          "Environment must be reset before it can be started again.",
        )
      }

      // current.status is now READY (either freshly provisioned or pre-existing)
      const startResult = await runtime.start(current)
      const activateAt = now()
      current = await transition(current, "ACTIVE", {
        runtimeStatus: startResult.runtimeStatus,
        startedAt: activateAt,
        lastActivityAt: activateAt,
        expiresAt: cappedExpiry(activateAt, current.createdAt),
      })
      await record("ENVIRONMENT_ACTIVATED", actor.id, ctx)
      return current
    },

    async touchEnvironment(actor, id): Promise<EnvironmentRecord> {
      const env = await loadOwned(actor, id)
      const at = now()
      if (!LIVE_STATUSES.includes(env.status)) {
        throw conflict(
          "ENVIRONMENT_INVALID_STATE",
          "Only a live environment can be kept alive.",
        )
      }
      if (isExpired(env, at)) {
        throw conflict("ENVIRONMENT_EXPIRED", "Environment has expired.")
      }
      const updated = await repos.environments.update(env.id, {
        lastActivityAt: at,
        expiresAt: cappedExpiry(at, env.createdAt),
      })
      if (!updated) {
        throw notFound("ENVIRONMENT_NOT_FOUND", "Environment not found.")
      }
      return updated
    },

    async resetEnvironment(actor, id, ctx): Promise<EnvironmentRecord> {
      const env = await loadOwned(actor, id)
      if (
        env.status !== "READY" &&
        env.status !== "ACTIVE" &&
        env.status !== "TIMEOUT"
      ) {
        throw conflict(
          "ENVIRONMENT_INVALID_STATE",
          "Environment cannot be reset from its current state.",
        )
      }
      await record("ENVIRONMENT_RESET_REQUESTED", actor.id, ctx)
      let current = await transition(env, "RESETTING")
      const result = await runtime.reset(current)
      const doneAt = now()
      current = await transition(current, "READY", {
        runtimeStatus: result.runtimeStatus,
        readyAt: doneAt,
        startedAt: null,
        lastActivityAt: doneAt,
        expiresAt: cappedExpiry(doneAt, current.createdAt),
      })
      return current
    },

    async stopEnvironment(actor, id, ctx): Promise<EnvironmentRecord> {
      const env = await loadOwned(actor, id)
      if (env.status === "READY") return env // idempotent no-op
      if (env.status !== "ACTIVE") {
        throw conflict(
          "ENVIRONMENT_INVALID_STATE",
          "Only an active environment can be stopped.",
        )
      }
      await record("ENVIRONMENT_STOP_REQUESTED", actor.id, ctx)
      const result = await runtime.stop(env)
      return transition(env, "READY", {
        runtimeStatus: result.runtimeStatus,
        startedAt: null,
      })
    },

    async destroyEnvironment(actor, id, ctx): Promise<EnvironmentRecord> {
      const env = await loadOwned(actor, id)
      if (env.status === "DESTROYED") return env // idempotent no-op
      await record("ENVIRONMENT_DESTROY_REQUESTED", actor.id, ctx)
      let current = env
      if (current.status !== "DESTROYING") {
        current = await transition(current, "DESTROYING")
      }
      const result = await runtime.destroy(current)
      const doneAt = now()
      current = await transition(current, "DESTROYED", {
        runtimeStatus: result.runtimeStatus,
        destroyedAt: doneAt,
      })
      await record("ENVIRONMENT_DESTROYED", actor.id, ctx)
      return current
    },

    async timeoutEnvironment(id, ctx): Promise<EnvironmentRecord | null> {
      const env = await repos.environments.findById(id)
      if (!env) return null
      if (!LIVE_STATUSES.includes(env.status)) return env // already terminal
      const result = await runtime.stop(env)
      const at = now()
      const updated = await transition(env, "TIMEOUT", {
        runtimeStatus: result.runtimeStatus,
        timeoutAt: at,
      })
      await record("ENVIRONMENT_TIMEOUT", env.userId, ctx)
      return updated
    },

    async failEnvironment(
      id,
      failureCode,
      failureMessage,
      ctx,
    ): Promise<EnvironmentRecord | null> {
      const env = await repos.environments.findById(id)
      if (!env) return null
      if (env.status === "FAILED" || env.status === "DESTROYED") return env
      const updated = await transition(env, "FAILED", {
        failureCode,
        failureMessage,
      })
      await record("ENVIRONMENT_FAILED", env.userId, ctx)
      return updated
    },

    async cleanupExpiredEnvironments(before): Promise<number> {
      const cutoff = before ?? now()
      const expired = await repos.environments.findExpired(cutoff, LIVE_STATUSES)
      let count = 0
      for (const env of expired) {
        const result = await runtime.stop(env)
        await transition(env, "TIMEOUT", {
          runtimeStatus: result.runtimeStatus,
          timeoutAt: now(),
        })
        await record("ENVIRONMENT_TIMEOUT", env.userId)
        count += 1
      }
      return count
    },
  }
}

export { createEnvironmentService }
