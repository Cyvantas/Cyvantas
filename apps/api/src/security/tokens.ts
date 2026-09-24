/**
 * Session token generation and hashing.
 *
 * The raw session token is a high-entropy opaque random string. It is sent to
 * the client ONLY inside an HttpOnly cookie and is NEVER persisted or logged.
 * The database stores only a SHA-256 hash of the token, so a database read
 * cannot be replayed to forge a session.
 *
 * SHA-256 is appropriate here (unlike for passwords): the token already carries
 * 256 bits of entropy, so it is not brute-forceable and needs no slow KDF.
 */
import { randomBytes, createHash, timingSafeEqual } from "node:crypto"

const TOKEN_BYTES = 32 // 256 bits of entropy

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Constant-time comparison of two hex-encoded token hashes. */
export function tokenHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex")
  const bufB = Buffer.from(b, "hex")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
