/**
 * Request validation schemas (Zod). Validation failures are surfaced through
 * the standard error envelope as a generic VALIDATION_ERROR — field-level
 * internals are not echoed back to the client.
 */
import { z } from "zod"
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../security/password.ts"

const EMAIL_MAX = 254
const DISPLAY_NAME_MIN = 2
const DISPLAY_NAME_MAX = 80

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  displayName: z.string().trim().min(DISPLAY_NAME_MIN).max(DISPLAY_NAME_MAX),
})

export const loginSchema = z.object({
  // Login intentionally does NOT enforce the password policy (which could leak
  // the policy and rejects legitimate legacy inputs); it only requires a
  // non-empty, bounded string. Credentials are verified against the store.
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
})

export type RegisterBody = z.infer<typeof registerSchema>
export type LoginBody = z.infer<typeof loginSchema>
