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
  CreateSessionInput,
  CreateUserInput,
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

function cloneUser(u: UserRecord): UserRecord {
  return { ...u, roles: [...u.roles] }
}

export function createInMemoryRepositories(): Repositories {
  const usersById = new Map<string, UserRecord>()
  const usersByEmail = new Map<string, string>()
  const sessions = new Map<string, SessionRecord>()
  const progress = new Map<string, ProgressRecordInput & { completedAt: Date | null }>()

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

  return {
    users,
    sessions: sessionRepo,
    audit,
    progress: progressRepo,
    async shutdown() {},
  }
}
