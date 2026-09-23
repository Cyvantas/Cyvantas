/**
 * Shared API response contract for the future CYVANTAS Lab backend.
 *
 * ARCHITECTURE ONLY (Phase 6): no backend exists. These types define the
 * envelope every endpoint will use so providers can adopt a real API later
 * without changing consumers. See docs/LAB-BACKEND-ARCHITECTURE.md §20.
 */

/** Successful response envelope: `{ "data": ... }`. */
export interface ApiSuccess<T> {
  data: T
}

/**
 * Error response envelope. Never carries stack traces or internal
 * infrastructure details — only a stable machine code, a human-readable
 * message, and a correlation id.
 */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    requestId: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

/** Type guard: narrow an {@link ApiResponse} to its success case. */
export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return (res as ApiSuccess<T>).data !== undefined
}

/**
 * Error thrown by the API client. `erasableSyntaxOnly` forbids constructor
 * parameter properties, so fields are assigned explicitly.
 */
export class ApiClientError extends Error {
  readonly code: string
  readonly requestId: string | null

  constructor(code: string, message: string, requestId: string | null = null) {
    super(message)
    this.name = "ApiClientError"
    this.code = code
    this.requestId = requestId
  }
}
