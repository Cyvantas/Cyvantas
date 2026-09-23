/**
 * Progress abstraction for learning paths.
 *
 * There is intentionally NO persistence yet — no backend, no accounts, and no
 * localStorage/sessionStorage (Phase 4 constraint). This interface defines the
 * contract a real, account-backed provider will implement later. The current
 * implementation is an honest no-op: nothing is ever marked complete, so the
 * UI can distinguish "available" from "completed" without pretending progress
 * was saved.
 */

export type ProgressState = "available" | "completed"

export interface PathProgress {
  pathId: string
  /** Fraction complete in the range 0–1. Always 0 for the no-op provider. */
  completion: number
  completedModuleIds: string[]
  completedLessonIds: string[]
}

export interface LearningProgressProvider {
  /** Whether this provider actually persists progress. */
  readonly supportsPersistence: boolean
  getPathProgress(pathId: string): PathProgress
  getModuleProgress(moduleId: string): ProgressState
  getLessonProgress(lessonId: string): ProgressState
  markLessonComplete(lessonId: string): void
  markModuleComplete(moduleId: string): void
}

/**
 * No-op provider. Reports everything as `available` and persists nothing.
 * Mutation methods are deliberately inert until Lab accounts exist.
 */
export const noopLearningProgressProvider: LearningProgressProvider = {
  supportsPersistence: false,

  getPathProgress(pathId) {
    return { pathId, completion: 0, completedModuleIds: [], completedLessonIds: [] }
  },

  getModuleProgress() {
    return "available"
  },

  getLessonProgress() {
    return "available"
  },

  markLessonComplete() {
    /* no-op until account-backed progress exists */
  },

  markModuleComplete() {
    /* no-op until account-backed progress exists */
  },
}

/** Active provider. Swap for an account-backed implementation in a later phase. */
export const learningProgressProvider = noopLearningProgressProvider
