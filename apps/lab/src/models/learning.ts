/**
 * Learning-path domain model for the CYVANTAS Security Lab.
 *
 * Deliberately generic so a real backend can serve the same shapes later:
 * paths reference challenges and tools by slug (not embedded copies), and
 * progress is modelled separately from content (see LearningProgressProvider).
 */

export type LearningCategory =
  | "fundamentals"
  | "web"
  | "authentication"
  | "api"
  | "access-control"
  | "recon"
  | "testing"

export type LearningDifficulty = "beginner" | "intermediate" | "advanced"

/** Publication state. Only `available` paths are surfaced in the catalogue. */
export type LearningStatus = "available" | "draft"

export type LessonContentType =
  | "concept"
  | "walkthrough"
  | "checklist"
  | "lab"
  | "challenge"
  | "review"

export interface LearningLesson {
  id: string
  title: string
  summary: string
  contentType: LessonContentType
  estimatedMinutes: number
  order: number
}

export interface LearningModule {
  id: string
  pathId: string
  title: string
  description: string
  estimatedMinutes: number
  order: number
  lessons: LearningLesson[]
  /** Existing challenge slugs practised in this module. */
  challengeSlugs: string[]
  /** Existing security-tool slugs used in this module. */
  toolSlugs: string[]
}

export interface LearningPath {
  id: string
  slug: string
  title: string
  shortDescription: string
  description: string
  category: LearningCategory
  difficulty: LearningDifficulty
  estimatedMinutes: number
  /** Slugs of paths recommended before this one (informational only). */
  prerequisites: string[]
  learningObjectives: string[]
  modules: LearningModule[]
  /** Existing challenge slugs related to the whole path. */
  relatedChallenges: string[]
  /** Existing security-tool slugs related to the whole path. */
  relatedTools: string[]
  status: LearningStatus
  /** Suggested progression order across the catalogue. */
  order: number
}
