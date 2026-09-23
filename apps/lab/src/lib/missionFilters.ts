/**
 * Pure CTF mission filtering logic, decoupled from any component.
 * All operations are synchronous and local so filtering happens client-side —
 * no network requests, no persistence.
 */
import type {
  CTFMission,
  MissionCategory,
  MissionDifficulty,
  MissionStatus,
} from "../models/ctf"

export type MissionCategoryFilter = MissionCategory | "all"
export type MissionDifficultyFilter = MissionDifficulty | "all"
export type MissionStatusFilter = MissionStatus | "all"

export interface MissionFilterState {
  category: MissionCategoryFilter
  difficulty: MissionDifficultyFilter
  status: MissionStatusFilter
  query: string
}

export const MISSION_CATEGORY_FILTERS: { value: MissionCategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "recon", label: "Recon" },
  { value: "web", label: "Web Security" },
  { value: "authentication", label: "Authentication" },
  { value: "access-control", label: "Access Control" },
  { value: "api", label: "API Security" },
  { value: "defensive", label: "Defensive" },
]

export const MISSION_DIFFICULTY_FILTERS: { value: MissionDifficultyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export const MISSION_STATUS_FILTERS: { value: MissionStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
]

export const INITIAL_MISSION_FILTER_STATE: MissionFilterState = {
  category: "all",
  difficulty: "all",
  status: "all",
  query: "",
}

/**
 * Resolves a mission's runtime status. With no persistence the default always
 * returns "available"; the hook injects the progress provider's resolver so a
 * real backend can drive the status filter without changing this logic.
 */
export type MissionStatusResolver = (mission: CTFMission) => MissionStatus

const defaultStatusResolver: MissionStatusResolver = () => "available"

/**
 * Local, case-insensitive filtering over category, difficulty, status, and a
 * text query. Search matches title, descriptions, category, and objectives.
 */
export function filterMissions(
  missions: CTFMission[],
  { category, difficulty, status, query }: MissionFilterState,
  statusOf: MissionStatusResolver = defaultStatusResolver,
): CTFMission[] {
  const q = query.trim().toLowerCase()
  return missions.filter((mission) => {
    if (category !== "all" && mission.category !== category) return false
    if (difficulty !== "all" && mission.difficulty !== difficulty) return false
    if (status !== "all" && statusOf(mission) !== status) return false
    if (!q) return true
    const haystack = [
      mission.title,
      mission.shortDescription,
      mission.description,
      mission.category,
      ...mission.objectives,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}

/** Count of required stages in a mission (informational). */
export function countStages(mission: CTFMission): number {
  return mission.stages.length
}

/** Resolve prerequisite mission slugs to missions, preserving order. */
export function resolveMissionPrerequisites(
  mission: CTFMission,
  all: CTFMission[],
): CTFMission[] {
  return mission.prerequisites
    .map((slug) => all.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is CTFMission => candidate !== undefined)
}
