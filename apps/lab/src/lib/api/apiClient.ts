/**
 * API client boundary for the future CYVANTAS Lab backend.
 *
 * ARCHITECTURE ONLY (Phase 6). This defines the interface providers will use to
 * reach the API gateway (see docs/LAB-BACKEND-ARCHITECTURE.md §4, §27). It makes
 * NO network calls and adds NO persistence. The active client is a deliberate
 * "not configured" stub: any call throws a clear error rather than silently
 * hitting a backend that does not exist yet.
 *
 * When a backend arrives, swap `apiClient` for a fetch-based implementation of
 * this same interface — no consumer changes required.
 */
import type { ApiResponse } from "./types"
import { ApiClientError } from "./types"

export interface ApiClient {
  /** Whether a real backend is wired up. Always false in this phase. */
  readonly configured: boolean
  get<T>(path: string): Promise<ApiResponse<T>>
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>>
  delete<T>(path: string): Promise<ApiResponse<T>>
}

function notConfigured(): never {
  throw new ApiClientError(
    "BACKEND_NOT_CONFIGURED",
    "The CYVANTAS Lab backend is not available yet. This is an interface-only " +
      "stub; no network request was made.",
  )
}

/**
 * Honest stub. Reports `configured=false` and throws on any call so callers
 * must branch on `configured` before attempting a request. Never touches the
 * network, storage, or any external service.
 */
export const notConfiguredApiClient: ApiClient = {
  configured: false,
  async get() {
    return notConfigured()
  },
  async post() {
    return notConfigured()
  },
  async delete() {
    return notConfigured()
  },
}

/** Active client. Swap for a fetch-based implementation in a later phase. */
export const apiClient: ApiClient = notConfiguredApiClient
