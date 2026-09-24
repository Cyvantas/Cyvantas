/**
 * Password hashing and password-policy enforcement.
 *
 * Algorithm: Argon2id (memory-hard, side-channel resistant) via `hash-wasm`,
 * a pure-WASM implementation that needs no native compilation — important on
 * platforms without prebuilt native argon2 bindings.
 *
 * Never logs passwords. Never stores or returns plaintext. The produced hash
 * is a self-describing PHC string ($argon2id$v=19$m=...,t=...,p=...$salt$hash)
 * that embeds all parameters needed for verification.
 */
import { argon2id, argon2Verify } from "hash-wasm"
import { randomBytes } from "node:crypto"

// Argon2id parameters. Tuned for interactive login on modest hardware while
// staying comfortably above OWASP minimums (m>=19MiB, t>=2).
const ARGON2_MEMORY_KIB = 19_456 // ~19 MiB
const ARGON2_ITERATIONS = 3
const ARGON2_PARALLELISM = 1
const ARGON2_HASH_LENGTH = 32
const SALT_BYTES = 16

// Password policy. Reject empty; cap length so a huge input cannot be used to
// exhaust hashing CPU/memory. We do NOT silently truncate — over-long input is
// rejected outright.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export interface PasswordPolicyResult {
  ok: boolean
  reason?: string
}

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length === 0) {
    return { ok: false, reason: "Password must not be empty." }
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    }
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
    }
  }
  return { ok: true }
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(SALT_BYTES),
    memorySize: ARGON2_MEMORY_KIB,
    iterations: ARGON2_ITERATIONS,
    parallelism: ARGON2_PARALLELISM,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: "encoded",
  })
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash })
  } catch {
    // Malformed stored hash → treat as non-match rather than surfacing details.
    return false
  }
}
