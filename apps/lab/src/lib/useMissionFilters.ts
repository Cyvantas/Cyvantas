import { useMemo, useState } from "react"
import type { CTFMission } from "../models/ctf"
import {
  filterMissions,
  INITIAL_MISSION_FILTER_STATE,
  type MissionCategoryFilter,
  type MissionDifficultyFilter,
  type MissionStatusFilter,
} from "./missionFilters"
import { missionProgressProvider } from "../providers/MissionProgressProvider"

/**
 * Owns CTF mission filter state and derives results with memoized pure logic,
 * keeping the route component free of filtering details. Mirrors
 * useLearningFilters. The status filter is driven by the progress provider —
 * with the current no-op provider every mission resolves to "available".
 */
export function useMissionFilters(all: CTFMission[]) {
  const [category, setCategory] = useState<MissionCategoryFilter>(
    INITIAL_MISSION_FILTER_STATE.category,
  )
  const [difficulty, setDifficulty] = useState<MissionDifficultyFilter>(
    INITIAL_MISSION_FILTER_STATE.difficulty,
  )
  const [status, setStatus] = useState<MissionStatusFilter>(
    INITIAL_MISSION_FILTER_STATE.status,
  )
  const [query, setQuery] = useState(INITIAL_MISSION_FILTER_STATE.query)

  const results = useMemo(
    () =>
      filterMissions(
        all,
        { category, difficulty, status, query },
        (mission) => missionProgressProvider.getMissionStatus(mission.id),
      ),
    [all, category, difficulty, status, query],
  )

  const isFiltered =
    category !== "all" ||
    difficulty !== "all" ||
    status !== "all" ||
    query.trim() !== ""

  const reset = () => {
    setCategory("all")
    setDifficulty("all")
    setStatus("all")
    setQuery("")
  }

  return {
    category,
    setCategory,
    difficulty,
    setDifficulty,
    status,
    setStatus,
    query,
    setQuery,
    results,
    isFiltered,
    reset,
  }
}
