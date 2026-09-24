/**
 * Repository interfaces — the persistence boundary for auth/session/progress.
 *
 * Services depend on these interfaces, never on Prisma directly. Two
 * implementations exist: a Prisma/PostgreSQL one (production) and an in-memory
 * one (local dev without a database, and tests). This keeps auth logic
 * testable without a running PostgreSQL and keeps SQL out of route handlers.
 */
import type { RoleName } from "../domain/roles.ts"

export interface UserRecord {
  id: string
  email: string
  passwordHash: string
  displayName: string
  isActive: boolean
  roles: RoleName[]
}

export interface SessionRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  lastSeenAt: Date
  revokedAt: Date | null
}

export interface SessionWithUser {
  session: SessionRecord
  user: UserRecord
}

export interface CreateUserInput {
  email: string
  passwordHash: string
  displayName: string
  roles: RoleName[]
}

export interface CreateSessionInput {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export type AuditEventName =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "REGISTER"
  | "SESSION_REVOKED"
  | "ROLE_CHANGED"

export interface AuditRecordInput {
  event: AuditEventName
  userId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export type ProgressKind = "challenge" | "learning" | "mission"

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>
  findById(id: string): Promise<UserRecord | null>
  /** Creates the user and assigns the given roles atomically. */
  createUser(input: CreateUserInput): Promise<UserRecord>
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionRecord>
  findByTokenHash(tokenHash: string): Promise<SessionWithUser | null>
  touchLastSeen(sessionId: string, at: Date): Promise<void>
  revoke(sessionId: string, at: Date): Promise<void>
  revokeAllForUser(userId: string, at: Date): Promise<void>
  /** Housekeeping: delete rows already past expiry. Returns count removed. */
  deleteExpired(before: Date): Promise<number>
}

export interface AuditRepository {
  record(input: AuditRecordInput): Promise<void>
}

export interface ProgressRecordInput {
  userId: string
  slug: string
  status: string
  completedAt?: Date | null
}

export interface ProgressRepository {
  upsert(kind: ProgressKind, input: ProgressRecordInput): Promise<void>
  listForUser(
    kind: ProgressKind,
    userId: string,
  ): Promise<Array<{ slug: string; status: string; completedAt: Date | null }>>
}

export interface Repositories {
  users: UserRepository
  sessions: SessionRepository
  audit: AuditRepository
  progress: ProgressRepository
  /** Called on server shutdown to release resources (DB connections). */
  shutdown(): Promise<void>
}
