/**
 * Progress abstraction for CTF missions.
 *
 * There is intentionally NO persistence yet — no backend, no accounts, and no
 * localStorage/sessionStorage (Phase 5 constraint). This interface defines the
 * contract a real, account-backed provider will implement later. The current
 * implementation is an honest no-op: nothing is ever started or completed, so
 * the UI can present every mission as "Available" without pretending progress
 * was saved.
 */
import type { MissionProgress, MissionStatus } from "../models/ctf"

export interface MissionProgressProvider {
  /** Whether this provider actually persists progress. Always false for now. */
  readonly supportsPersistence: boolean
  getMissionProgress(missionId: string): MissionProgress
  getMissionStatus(missionId: string): MissionStatus
  startMission(missionId: string): void
  completeStage(missionId: string, stageId: string): void
  completeMission(missionId: string): void
}

function emptyProgress(missionId: string): MissionProgress {
  return {
    missionId,
    currentStageId: null,
    completedStageIds: [],
    earnedPoints: 0,
    startedAt: null,
    completedAt: null,
  }
}

/**
 * No-op provider. Reports every mission as `available`, persists nothing, and
 * ignores mutations. Swap for an account-backed implementation in a later
 * phase; consumers should branch on `supportsPersistence` before showing any
 * progress UI.
 */
export const noopMissionProgressProvider: MissionProgressProvider = {
  supportsPersistence: false,

  getMissionProgress(missionId) {
    return emptyProgress(missionId)
  },

  getMissionStatus() {
    return "available"
  },

  startMission() {
    /* no-op until account-backed progress exists */
  },

  completeStage() {
    /* no-op until account-backed progress exists */
  },

  completeMission() {
    /* no-op until account-backed progress exists */
  },
}

/** Active provider. Swap for an account-backed implementation in a later phase. */
export const missionProgressProvider = noopMissionProgressProvider
