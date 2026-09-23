import { useMemo, useState } from "react"
import type { LearningPath } from "../models/learning"
import {
  filterLearningPaths,
  INITIAL_LEARNING_FILTER_STATE,
  type DurationFilter,
  type LearningCategoryFilter,
  type LearningDifficultyFilter,
} from "./learningFilters"

/**
 * Owns learning-path filter state and derives results with memoized pure
 * logic, keeping the route component free of filtering details. Mirrors
 * useChallengeFilters.
 */
export function useLearningFilters(all: LearningPath[]) {
  const [category, setCategory] = useState<LearningCategoryFilter>(
    INITIAL_LEARNING_FILTER_STATE.category,
  )
  const [difficulty, setDifficulty] = useState<LearningDifficultyFilter>(
    INITIAL_LEARNING_FILTER_STATE.difficulty,
  )
  const [duration, setDuration] = useState<DurationFilter>(
    INITIAL_LEARNING_FILTER_STATE.duration,
  )
  const [query, setQuery] = useState(INITIAL_LEARNING_FILTER_STATE.query)

  const results = useMemo(
    () => filterLearningPaths(all, { category, difficulty, duration, query }),
    [all, category, difficulty, duration, query],
  )

  const isFiltered =
    category !== "all" ||
    difficulty !== "all" ||
    duration !== "all" ||
    query.trim() !== ""

  const reset = () => {
    setCategory("all")
    setDifficulty("all")
    setDuration("all")
    setQuery("")
  }

  return {
    category,
    setCategory,
    difficulty,
    setDifficulty,
    duration,
    setDuration,
    query,
    setQuery,
    results,
    isFiltered,
    reset,
  }
}
