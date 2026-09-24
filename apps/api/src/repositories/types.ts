/**
 * Repository interfaces — the persistence boundary for auth/session/progress.
 *
 * Services depend on these interfaces, never on Prisma directly. Two
 * implementations exist: a Prisma/PostgreSQL one (production) and an in-memory
 * one (local dev without a database, and tests). This keeps auth logic
 * testable without a running PostgreSQL and keeps SQL out of route handlers.
 */
import type { RoleName } from "../domain/roles.ts"
import type {
  EnvironmentRecord,
  EnvironmentRuntimeStatus,
  EnvironmentStatus,
  EnvironmentType,
} from "../domain/environment.ts"

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
  | "ENVIRONMENT_CREATED"
  | "ENVIRONMENT_START_REQUESTED"
  | "ENVIRONMENT_READY"
  | "ENVIRONMENT_ACTIVATED"
  | "ENVIRONMENT_RESET_REQUESTED"
  | "ENVIRONMENT_STOP_REQUESTED"
  | "ENVIRONMENT_DESTROY_REQUESTED"
  | "ENVIRONMENT_DESTROYED"
  | "ENVIRONMENT_TIMEOUT"
  | "ENVIRONMENT_FAILED"
  // Sandbox orchestration events (Phase 10).
  | "SANDBOX_PROVISION_REQUESTED"
  | "SANDBOX_PROVISION_REJECTED"
  | "SANDBOX_PROVISION_STARTED"
  | "SANDBOX_READY"
  | "SANDBOX_START_REQUESTED"
  | "SANDBOX_STARTED"
  | "SANDBOX_STOP_REQUESTED"
  | "SANDBOX_STOPPED"
  | "SANDBOX_RESET_REQUESTED"
  | "SANDBOX_RESET"
  | "SANDBOX_DESTROY_REQUESTED"
  | "SANDBOX_DESTROYED"
  | "SANDBOX_RUNTIME_UNAVAILABLE"
  | "SANDBOX_POLICY_REJECTED"
  | "SANDBOX_TIMEOUT"

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
  environments: EnvironmentRepository
  /** Called on server shutdown to release resources (DB connections). */
  shutdown(): Promise<void>
}

/** Fields set at creation time. The rest are derived by the service. */
export interface CreateEnvironmentInput {
  userId: string
  type: EnvironmentType
  challengeSlug: string | null
  missionSlug: string | null
  status: EnvironmentStatus
  runtimeStatus: EnvironmentRuntimeStatus
  requestedAt: Date
  lastActivityAt: Date
  expiresAt: Date
  metadata?: Record<string, unknown> | null
}

/**
 * Mutable fields a lifecycle transition may update. Immutable identity fields
 * (id, userId, type, target slugs, createdAt, requestedAt) are intentionally
 * absent so a transition can never rewrite ownership or the target.
 */
export interface EnvironmentUpdate {
  status?: EnvironmentStatus
  runtimeStatus?: EnvironmentRuntimeStatus
  provisioningStartedAt?: Date | null
  readyAt?: Date | null
  startedAt?: Date | null
  lastActivityAt?: Date
  expiresAt?: Date
  timeoutAt?: Date | null
  destroyedAt?: Date | null
  failureCode?: string | null
  failureMessage?: string | null
  metadata?: Record<string, unknown> | null
}

export interface EnvironmentRepository {
  create(input: CreateEnvironmentInput): Promise<EnvironmentRecord>
  findById(id: string): Promise<EnvironmentRecord | null>
  listByUser(userId: string): Promise<EnvironmentRecord[]>
  update(
    id: string,
    patch: EnvironmentUpdate,
  ): Promise<EnvironmentRecord | null>
  /**
   * Live (non-terminal) environments whose expiresAt is at/before `before`.
   * Used by cleanupExpiredEnvironments to time them out. `liveStatuses` scopes
   * the query to statuses still holding a slot.
   */
  findExpired(
    before: Date,
    liveStatuses: readonly EnvironmentStatus[],
  ): Promise<EnvironmentRecord[]>
}
