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
  ChallengeProgressEntry,
  CreateEnvironmentInput,
  CreateSessionInput,
  CreateUserInput,
  EnvironmentRepository,
  EnvironmentUpdate,
  ProgressKind,
  ProgressRecordInput,
  ProgressRepository,
  RecordSubmissionInput,
  Repositories,
  ScoringRepository,
  SessionRecord,
  SessionRepository,
  SessionWithUser,
  SubmissionOutcome,
  UserRecord,
  UserRepository,
  UserScoreSummary,
} from "./types.ts"
import { CHALLENGE_COMPLETION_REASON } from "./types.ts"
import type {
  EnvironmentRecord,
  EnvironmentStatus,
} from "../domain/environment.ts"
import { disconnectPrisma } from "../db/prisma.ts"
import { checkPrismaHealth } from "../db/databaseHealth.ts"

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

interface EnvironmentRow {
  id: string
  userId: string
  type: string
  challengeSlug: string | null
  missionSlug: string | null
  status: string
  runtimeStatus: string
  requestedAt: Date
  provisioningStartedAt: Date | null
  readyAt: Date | null
  startedAt: Date | null
  lastActivityAt: Date
  expiresAt: Date
  timeoutAt: Date | null
  destroyedAt: Date | null
  failureCode: string | null
  failureMessage: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

function mapEnv(row: EnvironmentRow): EnvironmentRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as EnvironmentRecord["type"],
    challengeSlug: row.challengeSlug,
    missionSlug: row.missionSlug,
    status: row.status as EnvironmentStatus,
    runtimeStatus: row.runtimeStatus as EnvironmentRecord["runtimeStatus"],
    requestedAt: row.requestedAt,
    provisioningStartedAt: row.provisioningStartedAt,
    readyAt: row.readyAt,
    startedAt: row.startedAt,
    lastActivityAt: row.lastActivityAt,
    expiresAt: row.expiresAt,
    timeoutAt: row.timeoutAt,
    destroyedAt: row.destroyedAt,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// Environment delegate accessed via a loose cast for the same reason as audit:
// avoid a hard dependency on a regenerated Prisma client on engine-less hosts.
interface EnvironmentDelegate {
  create: (args: unknown) => Promise<EnvironmentRow>
  findUnique: (args: unknown) => Promise<EnvironmentRow | null>
  findMany: (args: unknown) => Promise<EnvironmentRow[]>
  update: (args: unknown) => Promise<EnvironmentRow>
}

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
      // Delegate accessed via a loose cast so newly added AuditEvent enum values
      // (environment lifecycle events) do not require regenerating the Prisma
      // client to type-check on build hosts where the engine cannot run. The DB
      // enum is extended by the Phase 9 migration.
      const delegate = prisma.auditLog as unknown as {
        create: (args: unknown) => Promise<unknown>
      }
      await delegate.create({
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
    scoring: createScoringRepository(prisma),
    environments: createEnvironmentRepository(prisma),
    async checkHealth(timeoutMs) {
      return checkPrismaHealth(prisma, timeoutMs)
    },
    async shutdown() {
      await disconnectPrisma()
    },
  }
}

function createEnvironmentRepository(
  prisma: PrismaClient,
): EnvironmentRepository {
  const delegate = (prisma as unknown as { environment: EnvironmentDelegate })
    .environment

  return {
    async create(input: CreateEnvironmentInput): Promise<EnvironmentRecord> {
      const row = await delegate.create({
        data: {
          userId: input.userId,
          type: input.type,
          challengeSlug: input.challengeSlug,
          missionSlug: input.missionSlug,
          status: input.status,
          runtimeStatus: input.runtimeStatus,
          requestedAt: input.requestedAt,
          lastActivityAt: input.lastActivityAt,
          expiresAt: input.expiresAt,
          metadata: input.metadata ?? undefined,
        },
      })
      return mapEnv(row)
    },
    async findById(id): Promise<EnvironmentRecord | null> {
      const row = await delegate.findUnique({ where: { id } })
      return row ? mapEnv(row) : null
    },
    async listByUser(userId): Promise<EnvironmentRecord[]> {
      const rows = await delegate.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
      return rows.map(mapEnv)
    },
    async update(id, patch: EnvironmentUpdate): Promise<EnvironmentRecord | null> {
      const row = await delegate.update({
        where: { id },
        data: {
          ...patch,
          metadata: patch.metadata === undefined ? undefined : patch.metadata,
        },
      })
      return mapEnv(row)
    },
    async findExpired(
      before,
      liveStatuses: readonly EnvironmentStatus[],
    ): Promise<EnvironmentRecord[]> {
      const rows = await delegate.findMany({
        where: {
          status: { in: [...liveStatuses] },
          expiresAt: { lte: before },
        },
      })
      return rows.map(mapEnv)
    },
  }
}

interface ChallengeProgressRow {
  challengeSlug: string
  status: string
  attempts: number
  pointsAwarded: number
  firstSolvedAt: Date | null
  completedAt: Date | null
  lastAttemptAt: Date | null
}

// challengeProgress/scoreEvent delegates via loose casts — same rationale as the
// audit/environment delegates: avoid a hard dependency on a regenerated Prisma
// client on engine-less (Termux/aarch64) build hosts. The scoring columns/table
// are created by the Phase 12 migration.
interface ChallengeProgressDelegate {
  upsert: (args: unknown) => Promise<ChallengeProgressRow>
  update: (args: unknown) => Promise<ChallengeProgressRow>
  findMany: (args: unknown) => Promise<ChallengeProgressRow[]>
}

interface ScoreEventDelegate {
  create: (args: unknown) => Promise<unknown>
  aggregate: (args: unknown) => Promise<{ _sum: { points: number | null } }>
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  )
}

function createScoringRepository(prisma: PrismaClient): ScoringRepository {
  const cp = (prisma as unknown as { challengeProgress: ChallengeProgressDelegate })
    .challengeProgress
  const se = (prisma as unknown as { scoreEvent: ScoreEventDelegate }).scoreEvent

  async function sumPoints(userId: string): Promise<number> {
    const agg = await se.aggregate({ where: { userId }, _sum: { points: true } })
    return agg._sum.points ?? 0
  }

  return {
    async recordSubmission(
      input: RecordSubmissionInput,
    ): Promise<SubmissionOutcome> {
      const reason = input.reason ?? CHALLENGE_COMPLETION_REASON
      const where = {
        userId_challengeSlug: {
          userId: input.userId,
          challengeSlug: input.challengeSlug,
        },
      }

      // Always count the attempt. Atomic increment avoids a read-modify-write
      // race on the attempt counter.
      let row = await cp.upsert({
        where,
        create: {
          userId: input.userId,
          challengeSlug: input.challengeSlug,
          status: "in_progress",
          attempts: 1,
          lastAttemptAt: input.at,
        },
        update: {
          attempts: { increment: 1 },
          lastAttemptAt: input.at,
        },
      })

      let alreadySolved = false
      let pointsAwarded = 0

      if (input.correct) {
        if (row.firstSolvedAt) {
          alreadySolved = true
        } else {
          // The append-only ScoreEvent ledger's unique (userId, challengeSlug,
          // reason) key is the hard once-only guarantee: a duplicate/racing
          // correct submission's insert violates it (P2002) instead of
          // double-scoring. The progress row is derived best-effort.
          try {
            await se.create({
              data: {
                userId: input.userId,
                challengeSlug: input.challengeSlug,
                points: input.points,
                reason,
              },
            })
            row = await cp.update({
              where,
              data: {
                status: "completed",
                firstSolvedAt: input.at,
                completedAt: input.at,
                pointsAwarded: input.points,
              },
            })
            pointsAwarded = input.points
          } catch (error) {
            if (!isUniqueViolation(error)) throw error
            alreadySolved = true
            row = await cp.update({ where, data: { status: "completed" } })
          }
        }
      }

      const totalPoints = await sumPoints(input.userId)
      return {
        correct: input.correct,
        alreadySolved,
        pointsAwarded,
        totalPoints,
        completedAt: row.completedAt ?? null,
        attempts: row.attempts,
      }
    },

    async getUserSummary(userId: string): Promise<UserScoreSummary> {
      const rows = await cp.findMany({ where: { userId } })
      const challenges: ChallengeProgressEntry[] = rows.map((r) => ({
        challengeSlug: r.challengeSlug,
        status: r.status,
        attempts: r.attempts,
        pointsAwarded: r.pointsAwarded,
        firstSolvedAt: r.firstSolvedAt ?? null,
        completedAt: r.completedAt ?? null,
        lastAttemptAt: r.lastAttemptAt ?? null,
      }))
      const totalPoints = await sumPoints(userId)
      const solvedCount = challenges.filter((c) => c.firstSolvedAt !== null).length
      return { totalPoints, solvedCount, challenges }
    },
  }
}
