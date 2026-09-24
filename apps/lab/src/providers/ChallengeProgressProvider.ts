/**
 * Progress abstraction for security challenges.
 *
 * There is intentionally NO client-side persistence: no backend calls, no
 * accounts, no localStorage/sessionStorage. Challenge scoring is
 * server-authoritative (see apps/api Phase 12 — the ScoreEvent ledger and
 * challenge_progress). The client is authoritative for NOTHING: not points,
 * completion, solved-state, or attempts. This interface defines the contract a
 * real, account-backed provider will implement later by reading the API's
 * `GET /api/v1/progress`. The current implementation is an honest no-op: it
 * fabricates no saved scores, so the UI can present catalog point *values* for
 * display without pretending a user has earned them.
 */
import type { ChallengeStatus } from "../models/challenge"

/** Safe per-challenge progress view — mirrors the API's UserProgressView DTO. */
export interface ChallengeProgress {
  challengeSlug: string
  status: ChallengeStatus
  attempts: number
  pointsAwarded: number
  firstSolvedAt: string | null
  completedAt: string | null
  lastAttemptAt: string | null
}

export interface ChallengeProgressProvider {
  /** Whether this provider actually persists progress. Always false for now. */
  readonly supportsPersistence: boolean
  getChallengeProgress(challengeSlug: string): ChallengeProgress
  getChallengeStatus(challengeSlug: string): ChallengeStatus
  /** The user's server-computed total. Always 0 without an account backend. */
  getTotalPoints(): number
}

function emptyProgress(challengeSlug: string): ChallengeProgress {
  return {
    challengeSlug,
    status: "available",
    attempts: 0,
    pointsAwarded: 0,
    firstSolvedAt: null,
    completedAt: null,
    lastAttemptAt: null,
  }
}

/**
 * No-op provider. Reports every challenge as `available`, awards nothing, and
 * persists nothing. Swap for an account-backed implementation (reading the
 * server-authoritative `GET /api/v1/progress`) in a later phase; consumers must
 * branch on `supportsPersistence` before showing any earned-score UI.
 */
export const noopChallengeProgressProvider: ChallengeProgressProvider = {
  supportsPersistence: false,

  getChallengeProgress(challengeSlug) {
    return emptyProgress(challengeSlug)
  },

  getChallengeStatus() {
    return "available"
  },

  getTotalPoints() {
    return 0
  },
}

/** Active provider. Swap for an account-backed implementation in a later phase. */
export const challengeProgressProvider = noopChallengeProgressProvider
