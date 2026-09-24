import { describe, it, expect } from "vitest"
import {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "../src/security/password.ts"
import {
  generateSessionToken,
  hashSessionToken,
  tokenHashEquals,
} from "../src/security/tokens.ts"
import { toUserDTO, type AuthUser } from "../src/domain/user.ts"
import {
  createInMemoryRateLimiter,
  RATE_RULES,
} from "../src/security/rateLimiter.ts"
import { isTrustedOrigin } from "../src/security/csrf.ts"
import { requireAuth, requireRole, requireAnyRole } from "../src/plugins/auth.ts"
import { createAuthService } from "../src/services/authService.ts"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"
import { ApiError } from "../src/types/api.ts"

describe("password policy", () => {
  it("rejects empty and too-short passwords", () => {
    expect(checkPasswordPolicy("").ok).toBe(false)
    expect(checkPasswordPolicy("a".repeat(PASSWORD_MIN_LENGTH - 1)).ok).toBe(false)
  })
  it("rejects over-long passwords (no silent truncation)", () => {
    expect(checkPasswordPolicy("a".repeat(PASSWORD_MAX_LENGTH + 1)).ok).toBe(false)
  })
  it("accepts a policy-compliant password", () => {
    expect(checkPasswordPolicy("correct horse battery").ok).toBe(true)
  })
})

describe("password hashing (argon2id)", () => {
  it("produces an argon2id PHC hash that verifies", async () => {
    const hash = await hashPassword("correct horse battery")
    expect(hash.startsWith("$argon2id$")).toBe(true)
    expect(await verifyPassword("correct horse battery", hash)).toBe(true)
  })
  it("rejects a wrong password and never stores plaintext", async () => {
    const hash = await hashPassword("correct horse battery")
    expect(hash).not.toContain("correct horse battery")
    expect(await verifyPassword("wrong password here", hash)).toBe(false)
  })
  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("whatever", "not-a-hash")).toBe(false)
  })
})

describe("session tokens", () => {
  it("generates unique high-entropy tokens", () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(43)
  })
  it("hashes deterministically and compares in constant time", () => {
    const t = generateSessionToken()
    expect(hashSessionToken(t)).toBe(hashSessionToken(t))
    expect(tokenHashEquals(hashSessionToken(t), hashSessionToken(t))).toBe(true)
    expect(tokenHashEquals(hashSessionToken(t), hashSessionToken(generateSessionToken()))).toBe(false)
  })
})

describe("user DTO", () => {
  it("exposes only safe fields (no passwordHash / internal fields)", () => {
    const user: AuthUser = {
      id: "id-1",
      email: "a@example.com",
      displayName: "A",
      isActive: true,
      roles: ["USER"],
    }
    const dto = toUserDTO(user)
    expect(Object.keys(dto).sort()).toEqual(["displayName", "email", "id", "roles"])
    expect(dto).not.toHaveProperty("passwordHash")
    expect(dto).not.toHaveProperty("isActive")
  })
})

describe("in-memory rate limiter", () => {
  it("blocks after the limit within the window", () => {
    let t = 0
    const rl = createInMemoryRateLimiter(() => t)
    const rule = { limit: 3, windowMs: 1000 }
    expect(rl.check("k", rule).allowed).toBe(true)
    expect(rl.check("k", rule).allowed).toBe(true)
    expect(rl.check("k", rule).allowed).toBe(true)
    expect(rl.check("k", rule).allowed).toBe(false)
    t = 1001
    expect(rl.check("k", rule).allowed).toBe(true)
  })
  it("has stricter auth rules than the general API rule", () => {
    expect(RATE_RULES.login.limit).toBeLessThan(RATE_RULES.authApi.limit)
    expect(RATE_RULES.register.limit).toBeLessThan(RATE_RULES.authApi.limit)
  })
})

describe("CSRF origin check", () => {
  const allowed = ["http://localhost:5173"]
  it("accepts trusted origin and missing origin", () => {
    expect(isTrustedOrigin({ origin: "http://localhost:5173", referer: undefined, allowedOrigins: allowed })).toBe(true)
    expect(isTrustedOrigin({ origin: undefined, referer: undefined, allowedOrigins: allowed })).toBe(true)
  })
  it("rejects a foreign origin", () => {
    expect(isTrustedOrigin({ origin: "http://evil.example", referer: undefined, allowedOrigins: allowed })).toBe(false)
  })
  it("falls back to Referer origin", () => {
    expect(isTrustedOrigin({ origin: undefined, referer: "http://evil.example/x", allowedOrigins: allowed })).toBe(false)
  })
})

function fakeReq(authUser: AuthUser | null): { authUser: AuthUser | null } {
  return { authUser }
}
const noReply = {} as never

type GuardCallable = (
  req: { authUser: AuthUser | null },
  reply: unknown,
) => Promise<void>

function runGuard(guard: unknown, authUser: AuthUser | null): Promise<void> {
  return (guard as GuardCallable)(fakeReq(authUser), noReply)
}

describe("authorization guards", () => {
  const admin: AuthUser = { id: "1", email: "a@x.io", displayName: "A", isActive: true, roles: ["ADMIN"] }
  const author: AuthUser = { id: "2", email: "b@x.io", displayName: "B", isActive: true, roles: ["AUTHOR"] }
  const user: AuthUser = { id: "3", email: "c@x.io", displayName: "C", isActive: true, roles: ["USER"] }

  it("requireAuth rejects unauthenticated (401)", async () => {
    await expect(runGuard(requireAuth, null)).rejects.toMatchObject({ status: 401 })
    await expect(runGuard(requireAuth, user)).resolves.toBeUndefined()
  })
  it("requireRole(ADMIN) allows admin, rejects user (403)", async () => {
    await expect(runGuard(requireRole("ADMIN"), admin)).resolves.toBeUndefined()
    await expect(runGuard(requireRole("ADMIN"), user)).rejects.toMatchObject({ status: 403 })
  })
  it("requireAnyRole([AUTHOR,ADMIN]) allows author, rejects plain user", async () => {
    await expect(runGuard(requireAnyRole(["AUTHOR", "ADMIN"]), author)).resolves.toBeUndefined()
    await expect(runGuard(requireAnyRole(["AUTHOR", "ADMIN"]), user)).rejects.toBeInstanceOf(ApiError)
  })
})

describe("session lifecycle (service, injected clock)", () => {
  function setup() {
    let now = new Date("2026-01-01T00:00:00Z")
    const repositories = createInMemoryRepositories()
    const svc = createAuthService({ repositories, sessionTtlSeconds: 3600, now: () => now })
    return {
      svc,
      repositories,
      advance: (ms: number) => {
        now = new Date(now.getTime() + ms)
      },
    }
  }

  it("authenticates a valid session, rejects after expiry", async () => {
    const { svc, advance } = setup()
    const issued = await svc.register(
      { email: "u@example.com", password: "correct horse battery", displayName: "User" },
      {},
    )
    const ok = await svc.authenticateByToken(issued.token)
    expect(ok?.user.email).toBe("u@example.com")

    advance(3600 * 1000 + 1)
    expect(await svc.authenticateByToken(issued.token)).toBeNull()
  })

  it("rejects a revoked session after logout", async () => {
    const { svc } = setup()
    const issued = await svc.register(
      { email: "u2@example.com", password: "correct horse battery", displayName: "User2" },
      {},
    )
    const authed = await svc.authenticateByToken(issued.token)
    await svc.logout(authed!.sessionId, authed!.user.id, {})
    expect(await svc.authenticateByToken(issued.token)).toBeNull()
  })

  it("rejects an unknown token", async () => {
    const { svc } = setup()
    expect(await svc.authenticateByToken("bogus-token")).toBeNull()
  })
})
