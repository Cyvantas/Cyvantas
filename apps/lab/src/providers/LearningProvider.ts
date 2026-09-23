import type { LearningPath } from "../models/learning"
import { learningPaths } from "../data/learningPaths"

/**
 * Content provider for learning paths. Mirrors ChallengeProvider so a real
 * backend can replace the local source without touching consumers. Only
 * `available` paths are exposed; `draft` paths stay hidden until published.
 */
export interface LearningProvider {
  list(): Promise<LearningPath[]>
  getBySlug(slug: string): Promise<LearningPath | undefined>
}

const published = learningPaths.filter((path) => path.status === "available")

export const localLearningProvider: LearningProvider = {
  async list() {
    return [...published].sort((a, b) => a.order - b.order)
  },

  async getBySlug(slug) {
    return published.find((path) => path.slug === slug)
  },
}
