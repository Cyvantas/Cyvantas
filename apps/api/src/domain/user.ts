import type { RoleName } from "./roles.ts"

/**
 * Internal authenticated-user shape used across services. Note this includes
 * roles but NEVER the password hash or any session token — those never leave
 * the persistence/service boundary.
 */
export interface AuthUser {
  id: string
  email: string
  displayName: string
  isActive: boolean
  roles: RoleName[]
}

/**
 * Public, safe representation returned through the API. Deliberately omits
 * passwordHash, session tokens, timestamps, and every internal security field.
 */
export interface UserDTO {
  id: string
  email: string
  displayName: string
  roles: RoleName[]
}

export function toUserDTO(user: AuthUser): UserDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: [...user.roles],
  }
}
