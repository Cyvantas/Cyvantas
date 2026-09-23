import { useMemo, useState } from "react"
import type { Challenge } from "../models/challenge"
import {
  filterChallenges,
  INITIAL_FILTER_STATE,
  type CategoryFilter,
  type DifficultyFilter,
} from "./challengeFilters"

/**
 * Owns challenge filter state and derives results with memoized pure logic,
 * keeping the route component free of filtering details.
 */
export function useChallengeFilters(all: Challenge[]) {
  const [category, setCategory] = useState<CategoryFilter>(INITIAL_FILTER_STATE.category)
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(INITIAL_FILTER_STATE.difficulty)
  const [query, setQuery] = useState(INITIAL_FILTER_STATE.query)

  const results = useMemo(
    () => filterChallenges(all, { category, difficulty, query }),
    [all, category, difficulty, query],
  )

  const isFiltered =
    category !== "all" || difficulty !== "all" || query.trim() !== ""

  const reset = () => {
    setCategory("all")
    setDifficulty("all")
    setQuery("")
  }

  return {
    category,
    setCategory,
    difficulty,
    setDifficulty,
    query,
    setQuery,
    results,
    isFiltered,
    reset,
  }
}
