import type { Challenge } from "../models/challenge"
import { challenges } from "../data/challenges"

export interface ChallengeProvider {
  list(): Promise<Challenge[]>
  getBySlug(slug: string): Promise<Challenge | undefined>
}

export const localChallengeProvider: ChallengeProvider = {
  async list() {
    return challenges
  },

  async getBySlug(slug) {
    return challenges.find((challenge) => challenge.slug === slug)
  },
}
