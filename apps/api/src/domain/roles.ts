/**
 * Server-side roles. Authoritative role information is always derived from the
 * authenticated user's stored role assignments — never from client input.
 *
 * Defined as a const union (not a TS enum) to satisfy `erasableSyntaxOnly`.
 */

export const ROLE_NAMES = ["USER", "AUTHOR", "ADMIN", "SYSTEM"] as const

export type RoleName = (typeof ROLE_NAMES)[number]

export function isRoleName(value: string): value is RoleName {
  return (ROLE_NAMES as readonly string[]).includes(value)
}
