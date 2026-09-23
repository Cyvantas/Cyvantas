/**
 * API response contract for the CYVANTAS Lab API (Phase 7).
 *
 * Every response is one of two envelopes:
 *   success → { "data": <payload> }
 *   error   → { "error": { "code", "message", "status" } }
 *
 * Errors never carry stack traces or internal infrastructure details.
 */

export interface ApiSuccess<T> {
  data: T
}

export interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    status: number
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorEnvelope

export function success<T>(data: T): ApiSuccess<T> {
  return { data }
}

export function errorEnvelope(
  code: string,
  message: string,
  status: number,
): ApiErrorEnvelope {
  return { error: { code, message, status } }
}

/**
 * Typed application error. Routes throw this; the central error handler
 * serializes it into the standard error envelope with the right HTTP status.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

export function notImplemented(code: string, message: string): ApiError {
  return new ApiError(code, message, 501)
}

export function notFound(code: string, message: string): ApiError {
  return new ApiError(code, message, 404)
}
