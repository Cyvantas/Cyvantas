/**
 * Authentication service — registration, login, logout, and session
 * resolution. Contains the security-sensitive business logic; route handlers
 * stay thin. Depends only on repository interfaces and the security helpers,
 * so it is fully testable against the in-memory repositories.
 */
import type { AuthUser } from "../domain/user.ts"
import type { Repositories } from "../repositories/types.ts"
import { hashPassword, verifyPassword } from "../security/password.ts"
import {
  generateSessionToken,
  hashSessionToken,
} from "../security/tokens.ts"
import { ApiError } from "../types/api.ts"

export interface AuthServiceDeps {
  repositories: Repositories
  sessionTtlSeconds: number
  now?: () => Date
}

export interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthContext {
  ip?: string | null
  userAgent?: string | null
}

export interface SessionIssue {
  user: AuthUser
  /** Raw opaque token — set as an HttpOnly cookie, never persisted/logged. */
  token: string
  expiresAt: Date
}

function toAuthUser(record: {
  id: string
  email: string
  displayName: string
  isActive: boolean
  roles: AuthUser["roles"]
}): AuthUser {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    isActive: record.isActive,
    roles: [...record.roles],
  }
}

export interface AuthService {
  register(input: RegisterInput, ctx: AuthContext): Promise<SessionIssue>
  login(input: LoginInput, ctx: AuthContext): Promise<SessionIssue>
  logout(sessionId: string, userId: string, ctx: AuthContext): Promise<void>
  authenticateByToken(rawToken: string): Promise<{ user: AuthUser; sessionId: string } | null>
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const { repositories: repos, sessionTtlSeconds } = deps
  const now = deps.now ?? (() => new Date())

  // Precompute a valid dummy hash so login timing does not reveal whether an
  // email exists (we always run a verify, even for unknown accounts).
  let dummyHashPromise: Promise<string> | null = null
  function getDummyHash(): Promise<string> {
    if (!dummyHashPromise) {
      dummyHashPromise = hashPassword(generateSessionToken())
    }
    return dummyHashPromise
  }

  async function issueSession(user: AuthUser): Promise<SessionIssue> {
    const token = generateSessionToken()
    const tokenHash = hashSessionToken(token)
    const expiresAt = new Date(now().getTime() + sessionTtlSeconds * 1000)
    await repos.sessions.create({ userId: user.id, tokenHash, expiresAt })
    return { user, token, expiresAt }
  }

  return {
    async register(input, ctx): Promise<SessionIssue> {
      const email = input.email.trim().toLowerCase()
      const existing = await repos.users.findByEmail(email)
      if (existing) {
        // Non-specific: avoids confirming which emails are registered.
        throw new ApiError(
          "EMAIL_UNAVAILABLE",
          "Unable to register with the provided details.",
          409,
        )
      }
      const passwordHash = await hashPassword(input.password)
      const record = await repos.users.createUser({
        email,
        passwordHash,
        displayName: input.displayName.trim(),
        roles: ["USER"],
      })
      const user = toAuthUser(record)
      await repos.audit.record({
        event: "REGISTER",
        userId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return issueSession(user)
    },

    async login(input, ctx): Promise<SessionIssue> {
      const email = input.email.trim().toLowerCase()
      const record = await repos.users.findByEmail(email)

      // Always run a verify (real or dummy) so response timing is uniform and
      // does not disclose whether the email exists.
      const hashToCheck = record?.passwordHash ?? (await getDummyHash())
      const passwordOk = await verifyPassword(input.password, hashToCheck)

      if (!record || !record.isActive || !passwordOk) {
        await repos.audit.record({
          event: "LOGIN_FAILURE",
          userId: record?.id ?? null,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        })
        throw new ApiError(
          "INVALID_CREDENTIALS",
          "Invalid email or password.",
          401,
        )
      }

      const user = toAuthUser(record)
      await repos.audit.record({
        event: "LOGIN_SUCCESS",
        userId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return issueSession(user)
    },

    async logout(sessionId, userId, ctx): Promise<void> {
      await repos.sessions.revoke(sessionId, now())
      await repos.audit.record({
        event: "LOGOUT",
        userId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
    },

    async authenticateByToken(rawToken) {
      if (!rawToken) return null
      const tokenHash = hashSessionToken(rawToken)
      const found = await repos.sessions.findByTokenHash(tokenHash)
      if (!found) return null

      const { session, user } = found
      const current = now()
      if (session.revokedAt !== null) return null
      if (session.expiresAt.getTime() <= current.getTime()) return null
      if (!user.isActive) return null

      await repos.sessions.touchLastSeen(session.id, current)
      return { user: toAuthUser(user), sessionId: session.id }
    },
  }
}
