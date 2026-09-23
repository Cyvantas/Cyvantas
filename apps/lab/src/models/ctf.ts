/**
 * CTF / Missions domain model for the CYVANTAS Security Lab.
 *
 * Backend-ready by design: missions reference existing challenges, tools, and
 * learning paths by SLUG (never embedded copies), and progress is modelled
 * separately from content (see MissionProgressProvider). The same shapes can be
 * served by a real API later without touching consumers.
 */

export type MissionCategory =
  | "recon"
  | "web"
  | "authentication"
  | "access-control"
  | "api"
  | "defensive"

export type MissionDifficulty = "beginner" | "intermediate" | "advanced"

/** Publication state. Only `available` missions are surfaced in the catalogue. */
export type MissionPublishStatus = "available" | "draft"

/**
 * Runtime status of a mission for a given user. With no persistence yet, the
 * catalogue always reports `available`; the other states exist for when
 * account-backed progress is introduced.
 */
export type MissionStatus = "available" | "in-progress" | "completed"

/**
 * A single stage within a mission. Stages sequence a mission's objective and
 * can reference existing challenges the learner practises at that step.
 */
export interface MissionStage {
  id: string
  missionId: string
  title: string
  /** Longer explanation of what happens in this stage. */
  description: string
  /** One-line goal for the stage. */
  objective: string
  order: number
  /** Existing challenge slugs practised in this stage. */
  challengeSlugs: string[]
  /** Whether the stage must be completed to finish the mission. */
  required: boolean
  status: MissionStatus
}

/**
 * Structured briefing shown at the top of a mission detail page. Deliberately
 * scenario-based and scoped to a controlled training environment.
 */
export interface MissionBriefing {
  scenario: string
  objective: string
  scope: string
}

export interface CTFMission {
  id: string
  slug: string
  title: string
  shortDescription: string
  description: string
  difficulty: MissionDifficulty
  category: MissionCategory
  estimatedMinutes: number
  points: number
  briefing: MissionBriefing
  objectives: string[]
  /** Slugs of missions recommended before this one (informational only). */
  prerequisites: string[]
  stages: MissionStage[]
  /** Existing challenge slugs related to the whole mission. */
  challengeSlugs: string[]
  /** Existing security-tool slugs recommended for the mission. */
  toolSlugs: string[]
  /** Existing learning-path slugs connected to the mission. */
  learningPathSlugs: string[]
  status: MissionPublishStatus
  /** Suggested progression order across the catalogue. */
  order: number
}

/**
 * Per-user mission progress. NOT persisted yet — see MissionProgressProvider.
 * `startedAt` / `completedAt` are ISO-8601 strings when a real backend fills
 * them in; the no-op provider never sets them.
 */
export interface MissionProgress {
  missionId: string
  currentStageId: string | null
  completedStageIds: string[]
  earnedPoints: number
  startedAt: string | null
  completedAt: string | null
}
