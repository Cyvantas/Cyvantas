import type { CTFMission, MissionCategory } from "../models/ctf"
import { missions } from "../data/missions"

/**
 * Content provider for CTF missions. Mirrors ChallengeProvider and
 * LearningProvider so a real backend can replace the local source without
 * touching consumers. Only `available` missions are exposed; `draft` missions
 * stay hidden until published.
 */
export interface CTFProvider {
  listMissions(): Promise<CTFMission[]>
  getMission(slug: string): Promise<CTFMission | undefined>
  getMissionsByCategory(category: MissionCategory): Promise<CTFMission[]>
}

const published = missions.filter((mission) => mission.status === "available")

export const localCTFProvider: CTFProvider = {
  async listMissions() {
    return [...published].sort((a, b) => a.order - b.order)
  },

  async getMission(slug) {
    return published.find((mission) => mission.slug === slug)
  },

  async getMissionsByCategory(category) {
    return [...published]
      .filter((mission) => mission.category === category)
      .sort((a, b) => a.order - b.order)
  },
}
