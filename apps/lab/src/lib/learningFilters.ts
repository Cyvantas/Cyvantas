/**
 * Pure learning-path filtering logic, decoupled from any component.
 * All operations are synchronous and local so filtering happens client-side.
 */
import type {
  LearningCategory,
  LearningDifficulty,
  LearningPath,
} from "../models/learning"

export type LearningCategoryFilter = LearningCategory | "all"
export type LearningDifficultyFilter = LearningDifficulty | "all"
/** Coarse duration buckets, in minutes. */
export type DurationFilter = "all" | "short" | "medium" | "long"

export interface LearningFilterState {
  category: LearningCategoryFilter
  difficulty: LearningDifficultyFilter
  duration: DurationFilter
  query: string
}

export const LEARNING_CATEGORY_FILTERS: { value: LearningCategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "web", label: "Web Security" },
  { value: "authentication", label: "Authentication" },
  { value: "api", label: "API Security" },
  { value: "access-control", label: "Access Control" },
  { value: "recon", label: "Recon" },
  { value: "testing", label: "Testing" },
]

export const LEARNING_DIFFICULTY_FILTERS: { value: LearningDifficultyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export const DURATION_FILTERS: { value: DurationFilter; label: string }[] = [
  { value: "all", label: "Any length" },
  { value: "short", label: "Under 1.5 hr" },
  { value: "medium", label: "1.5–2 hr" },
  { value: "long", label: "Over 2 hr" },
]

export const INITIAL_LEARNING_FILTER_STATE: LearningFilterState = {
  category: "all",
  difficulty: "all",
  duration: "all",
  query: "",
}

function matchesDuration(minutes: number, filter: DurationFilter): boolean {
  switch (filter) {
    case "short":
      return minutes < 90
    case "medium":
      return minutes >= 90 && minutes <= 120
    case "long":
      return minutes > 120
    case "all":
    default:
      return true
  }
}

/**
 * Local, case-insensitive filtering over category, difficulty, duration, and a
 * text query. Search matches title, descriptions, category, and objectives.
 */
export function filterLearningPaths(
  paths: LearningPath[],
  { category, difficulty, duration, query }: LearningFilterState,
): LearningPath[] {
  const q = query.trim().toLowerCase()
  return paths.filter((path) => {
    if (category !== "all" && path.category !== category) return false
    if (difficulty !== "all" && path.difficulty !== difficulty) return false
    if (!matchesDuration(path.estimatedMinutes, duration)) return false
    if (!q) return true
    const haystack = [
      path.title,
      path.shortDescription,
      path.description,
      path.category,
      ...path.learningObjectives,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}

/** Total lesson count across a path's modules. */
export function countLessons(path: LearningPath): number {
  return path.modules.reduce((total, module) => total + module.lessons.length, 0)
}

/** Resolve prerequisite slugs to their paths, preserving prerequisite order. */
export function resolvePrerequisites(
  path: LearningPath,
  all: LearningPath[],
): LearningPath[] {
  return path.prerequisites
    .map((slug) => all.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is LearningPath => candidate !== undefined)
}
