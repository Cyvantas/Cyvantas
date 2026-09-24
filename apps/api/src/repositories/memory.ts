/**
 * In-memory repository implementation.
 *
 * Used for local development without PostgreSQL and for tests. Data lives only
 * for the process lifetime. It enforces the same unique constraints as the SQL
 * schema (unique email, unique session tokenHash, unique progress per
 * user+slug) so behaviour matches the Prisma implementation.
 */
import { randomUUID } from "node:crypto"
import type {
  AuditRepository,
  CreateEnvironmentInput,
  CreateSessionInput,
  CreateUserInput,
  EnvironmentRepository,
  EnvironmentUpdate,
  ProgressKind,
  ProgressRecordInput,
  ProgressRepository,
  Repositories,
  SessionRecord,
  SessionRepository,
  SessionWithUser,
  UserRecord,
  UserRepository,
} from "./types.ts"
import type {
  EnvironmentRecord,
  EnvironmentStatus,
} from "../domain/environment.ts"

function cloneUser(u: UserRecord): UserRecord {
  return { ...u, roles: [...u.roles] }
}

function cloneEnv(e: EnvironmentRecord): EnvironmentRecord {
  return { ...e, metadata: e.metadata ? { ...e.metadata } : null }
}

export function createInMemoryRepositories(): Repositories {
  const usersById = new Map<string, UserRecord>()
  const usersByEmail = new Map<string, string>()
  const sessions = new Map<string, SessionRecord>()
  const progress = new Map<string, ProgressRecordInput & { completedAt: Date | null }>()
  const environments = new Map<string, EnvironmentRecord>()

  const users: UserRepository = {
    async findByEmail(email) {
      const id = usersByEmail.get(email)
      const u = id ? usersById.get(id) : undefined
      return u ? cloneUser(u) : null
    },
    async findById(id) {
      const u = usersById.get(id)
      return u ? cloneUser(u) : null
    },
    async createUser(input: CreateUserInput) {
      if (usersByEmail.has(input.email)) {
        throw new Error("UNIQUE_EMAIL")
      }
      const record: UserRecord = {
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        isActive: true,
        roles: [...input.roles],
      }
      usersById.set(record.id, record)
      usersByEmail.set(record.email, record.id)
      return cloneUser(record)
    },
  }

  const sessionRepo: SessionRepository = {
    async create(input: CreateSessionInput) {
      for (const s of sessions.values()) {
        if (s.tokenHash === input.tokenHash) throw new Error("UNIQUE_TOKEN")
      }
      const now = new Date()
      const record: SessionRecord = {
        id: randomUUID(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: now,
        lastSeenAt: now,
        revokedAt: null,
      }
      sessions.set(record.id, record)
      return { ...record }
    },
    async findByTokenHash(tokenHash): Promise<SessionWithUser | null> {
      for (const s of sessions.values()) {
        if (s.tokenHash === tokenHash) {
          const u = usersById.get(s.userId)
          if (!u) return null
          return { session: { ...s }, user: cloneUser(u) }
        }
      }
      return null
    },
    async touchLastSeen(sessionId, at) {
      const s = sessions.get(sessionId)
      if (s) s.lastSeenAt = at
    },
    async revoke(sessionId, at) {
      const s = sessions.get(sessionId)
      if (s && s.revokedAt === null) s.revokedAt = at
    },
    async revokeAllForUser(userId, at) {
      for (const s of sessions.values()) {
        if (s.userId === userId && s.revokedAt === null) s.revokedAt = at
      }
    },
    async deleteExpired(before) {
      let removed = 0
      for (const [id, s] of sessions) {
        if (s.expiresAt <= before) {
          sessions.delete(id)
          removed += 1
        }
      }
      return removed
    },
  }

  const audit: AuditRepository = {
    // Audit records are not asserted against in-memory beyond not throwing;
    // the Prisma implementation persists them. Kept side-effect free here.
    async record() {},
  }

  const progressRepo: ProgressRepository = {
    async upsert(kind: ProgressKind, input: ProgressRecordInput) {
      progress.set(`${kind}:${input.userId}:${input.slug}`, {
        ...input,
        completedAt: input.completedAt ?? null,
      })
    },
    async listForUser(kind, userId) {
      const out: Array<{ slug: string; status: string; completedAt: Date | null }> = []
      const prefix = `${kind}:${userId}:`
      for (const [key, value] of progress) {
        if (key.startsWith(prefix)) {
          out.push({ slug: value.slug, status: value.status, completedAt: value.completedAt })
        }
      }
      return out
    },
  }

  const envRepo: EnvironmentRepository = {
    async create(input: CreateEnvironmentInput): Promise<EnvironmentRecord> {
      const now = new Date()
      const record: EnvironmentRecord = {
        id: randomUUID(),
        userId: input.userId,
        type: input.type,
        challengeSlug: input.challengeSlug,
        missionSlug: input.missionSlug,
        status: input.status,
        runtimeStatus: input.runtimeStatus,
        requestedAt: input.requestedAt,
        provisioningStartedAt: null,
        readyAt: null,
        startedAt: null,
        lastActivityAt: input.lastActivityAt,
        expiresAt: input.expiresAt,
        timeoutAt: null,
        destroyedAt: null,
        failureCode: null,
        failureMessage: null,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      }
      environments.set(record.id, record)
      return cloneEnv(record)
    },
    async findById(id): Promise<EnvironmentRecord | null> {
      const e = environments.get(id)
      return e ? cloneEnv(e) : null
    },
    async listByUser(userId): Promise<EnvironmentRecord[]> {
      const out: EnvironmentRecord[] = []
      for (const e of environments.values()) {
        if (e.userId === userId) out.push(cloneEnv(e))
      }
      return out
    },
    async update(id, patch: EnvironmentUpdate): Promise<EnvironmentRecord | null> {
      const e = environments.get(id)
      if (!e) return null
      // Only whitelisted mutable fields are applied; identity/target fields are
      // never in EnvironmentUpdate, so they cannot be rewritten here.
      const updated: EnvironmentRecord = {
        ...e,
        ...patch,
        metadata:
          patch.metadata !== undefined ? patch.metadata : e.metadata,
        updatedAt: new Date(),
      }
      environments.set(id, updated)
      return cloneEnv(updated)
    },
    async findExpired(
      before,
      liveStatuses: readonly EnvironmentStatus[],
    ): Promise<EnvironmentRecord[]> {
      const out: EnvironmentRecord[] = []
      for (const e of environments.values()) {
        if (liveStatuses.includes(e.status) && e.expiresAt <= before) {
          out.push(cloneEnv(e))
        }
      }
      return out
    },
  }

  return {
    users,
    sessions: sessionRepo,
    audit,
    progress: progressRepo,
    environments: envRepo,
    async shutdown() {},
  }
}
