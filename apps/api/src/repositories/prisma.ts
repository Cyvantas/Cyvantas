/**
 * Prisma/PostgreSQL implementation of the repository interfaces.
 *
 * Kept behind the repository interfaces so route handlers and services never
 * embed SQL/Prisma calls directly. Roles are self-seeding via connectOrCreate
 * so a fresh database does not require a manual seed step for the base roles.
 */
import type { PrismaClient } from "@prisma/client"
import type { RoleName } from "../domain/roles.ts"
import type {
  AuditRecordInput,
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
import { disconnectPrisma } from "../db/prisma.ts"

interface UserRow {
  id: string
  email: string
  passwordHash: string
  displayName: string
  isActive: boolean
  roles: Array<{ role: { name: string } }>
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    isActive: row.isActive,
    roles: row.roles.map((r) => r.role.name as RoleName),
  }
}

const USER_INCLUDE = { roles: { include: { role: true } } } as const

const PROGRESS_DELEGATE = {
  challenge: "challengeProgress",
  learning: "learningProgress",
  mission: "missionProgress",
} as const

const PROGRESS_SLUG_FIELD = {
  challenge: "challengeSlug",
  learning: "learningPathSlug",
  mission: "missionSlug",
} as const

export function createPrismaRepositories(prisma: PrismaClient): Repositories {
  const users: UserRepository = {
    async findByEmail(email) {
      const row = await prisma.user.findUnique({
        where: { email },
        include: USER_INCLUDE,
      })
      return row ? mapUser(row) : null
    },
    async findById(id) {
      const row = await prisma.user.findUnique({
        where: { id },
        include: USER_INCLUDE,
      })
      return row ? mapUser(row) : null
    },
    async createUser(input: CreateUserInput) {
      const row = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          roles: {
            create: input.roles.map((name) => ({
              role: {
                connectOrCreate: {
                  where: { name },
                  create: { name },
                },
              },
            })),
          },
        },
        include: USER_INCLUDE,
      })
      return mapUser(row)
    },
  }

  const sessions: SessionRepository = {
    async create(input: CreateSessionInput): Promise<SessionRecord> {
      return prisma.session.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      })
    },
    async findByTokenHash(tokenHash): Promise<SessionWithUser | null> {
      const row = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: { include: USER_INCLUDE } },
      })
      if (!row) return null
      const { user, ...session } = row
      return { session, user: mapUser(user) }
    },
    async touchLastSeen(sessionId, at) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastSeenAt: at },
      })
    },
    async revoke(sessionId, at) {
      await prisma.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: at },
      })
    },
    async revokeAllForUser(userId, at) {
      await prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: at },
      })
    },
    async deleteExpired(before) {
      const { count } = await prisma.session.deleteMany({
        where: { expiresAt: { lte: before } },
      })
      return count
    },
  }

  const audit: AuditRepository = {
    async record(input: AuditRecordInput) {
      await prisma.auditLog.create({
        data: {
          event: input.event,
          userId: input.userId ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      })
    },
  }

  const progress: ProgressRepository = {
    async upsert(kind: ProgressKind, input: ProgressRecordInput) {
      const delegate = prisma[PROGRESS_DELEGATE[kind]] as {
        upsert: (args: unknown) => Promise<unknown>
      }
      const slugField = PROGRESS_SLUG_FIELD[kind]
      await delegate.upsert({
        where: { [`userId_${slugField}`]: { userId: input.userId, [slugField]: input.slug } },
        create: {
          userId: input.userId,
          [slugField]: input.slug,
          status: input.status,
          completedAt: input.completedAt ?? null,
        },
        update: {
          status: input.status,
          completedAt: input.completedAt ?? null,
        },
      })
    },
    async listForUser(kind, userId) {
      const delegate = prisma[PROGRESS_DELEGATE[kind]] as {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>
      }
      const slugField = PROGRESS_SLUG_FIELD[kind]
      const rows = await delegate.findMany({ where: { userId } })
      return rows.map((r) => ({
        slug: String(r[slugField]),
        status: String(r.status),
        completedAt: (r.completedAt as Date | null) ?? null,
      }))
    },
  }

  return {
    users,
    sessions,
    audit,
    progress,
    async shutdown() {
      await disconnectPrisma()
    },
  }
}
