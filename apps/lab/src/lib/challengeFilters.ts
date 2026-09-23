/**
 * Pure challenge filtering / relatedness logic, decoupled from any component.
 * All operations are synchronous and local so filtering happens client-side.
 */
import type { Challenge, ChallengeCategory, Difficulty } from "../models/challenge"

export type CategoryFilter = ChallengeCategory | "all"
export type DifficultyFilter = Difficulty | "all"

export interface ChallengeFilterState {
  category: CategoryFilter
  difficulty: DifficultyFilter
  query: string
}

export const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "web", label: "Web Security" },
  { value: "authentication", label: "Authentication" },
  { value: "api", label: "API Security" },
  { value: "recon", label: "Recon" },
  { value: "ctf", label: "CTF" },
]

export const DIFFICULTY_FILTERS: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
]

export const INITIAL_FILTER_STATE: ChallengeFilterState = {
  category: "all",
  difficulty: "all",
  query: "",
}

/** Local, case-insensitive filtering over category, difficulty, and a text query. */
export function filterChallenges(
  challenges: Challenge[],
  { category, difficulty, query }: ChallengeFilterState,
): Challenge[] {
  const q = query.trim().toLowerCase()
  return challenges.filter((challenge) => {
    if (category !== "all" && challenge.category !== category) return false
    if (difficulty !== "all" && challenge.difficulty !== difficulty) return false
    if (!q) return true
    const haystack = [challenge.title, challenge.description, ...challenge.tags]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}

/**
 * Rank other challenges by relevance to `current`: same category is weighted,
 * then shared tags. Challenges with no overlap are excluded.
 */
export function relatedChallenges(
  all: Challenge[],
  current: Challenge,
  limit = 3,
): Challenge[] {
  const currentTags = new Set(current.tags)
  return all
    .filter((challenge) => challenge.slug !== current.slug)
    .map((challenge) => {
      const categoryScore = challenge.category === current.category ? 2 : 0
      const tagScore = challenge.tags.filter((tag) => currentTags.has(tag)).length
      return { challenge, score: categoryScore + tagScore }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.challenge)
}
