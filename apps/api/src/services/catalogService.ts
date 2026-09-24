/**
 * Catalog service — read-only public metadata for challenges, learning paths,
 * and missions.
 *
 * Reuses the existing Lab content (apps/lab/src/data/*) as the single source of
 * truth rather than duplicating definitions. Everything here is PUBLIC metadata:
 * it deliberately strips anything answer-adjacent (challenge hints/objectives,
 * internal ids, runtime status) and exposes no flags, secrets, or environment
 * internals — none of which exist in the current mock data anyway.
 *
 * The service is pure and synchronous over in-memory data. It makes no network
 * calls, spawns no processes, and reads no filesystem/secrets at request time.
 */
import type { Challenge } from "../../../lab/src/models/challenge"
import type { LearningPath } from "../../../lab/src/models/learning"
import type { CTFMission } from "../../../lab/src/models/ctf"
import { challenges } from "../../../lab/src/data/challenges"
import { learningPaths } from "../../../lab/src/data/learningPaths"
import { missions } from "../../../lab/src/data/missions"

/* -------------------------------------------------------------------------- */
/* Public DTOs                                                                */
/* -------------------------------------------------------------------------- */

export interface PublicChallenge {
  slug: string
  title: string
  description: string
  difficulty: string
  points: number
  category: string
  estimatedMinutes: number
  tags: string[]
}

/**
 * Challenge DETAIL — the list DTO plus safe objectives. Objectives describe
 * what the learner should accomplish and are safe to show; hints, internal ids,
 * status, and any flag/answer remain stripped.
 */
export interface PublicChallengeDetail extends PublicChallenge {
  objectives: string[]
}

export interface PublicLearningLesson {
  title: string
  summary: string
  contentType: string
  estimatedMinutes: number
  order: number
}

export interface PublicLearningModule {
  title: string
  description: string
  estimatedMinutes: number
  order: number
  lessons: PublicLearningLesson[]
}

export interface PublicLearningPathSummary {
  slug: string
  title: string
  shortDescription: string
  category: string
  difficulty: string
  estimatedMinutes: number
  order: number
}

export interface PublicLearningPath extends PublicLearningPathSummary {
  description: string
  prerequisites: string[]
  learningObjectives: string[]
  modules: PublicLearningModule[]
  relatedChallenges: string[]
  relatedTools: string[]
}

export interface PublicMissionStage {
  title: string
  description: string
  objective: string
  order: number
  required: boolean
  challengeSlugs: string[]
}

export interface PublicMissionSummary {
  slug: string
  title: string
  shortDescription: string
  category: string
  difficulty: string
  estimatedMinutes: number
  points: number
  order: number
}

export interface PublicMission extends PublicMissionSummary {
  description: string
  briefing: { scenario: string; objective: string; scope: string }
  objectives: string[]
  prerequisites: string[]
  stages: PublicMissionStage[]
  challengeSlugs: string[]
  toolSlugs: string[]
  learningPathSlugs: string[]
}

/* -------------------------------------------------------------------------- */
/* Mappers — whitelist public fields only                                     */
/* -------------------------------------------------------------------------- */

function toPublicChallenge(c: Challenge): PublicChallenge {
  return {
    slug: c.slug,
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    points: c.points,
    category: c.category,
    estimatedMinutes: c.estimatedMinutes,
    tags: [...c.tags],
  }
}

function toLearningSummary(p: LearningPath): PublicLearningPathSummary {
  return {
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    category: p.category,
    difficulty: p.difficulty,
    estimatedMinutes: p.estimatedMinutes,
    order: p.order,
  }
}

function toPublicLearningPath(p: LearningPath): PublicLearningPath {
  return {
    ...toLearningSummary(p),
    description: p.description,
    prerequisites: [...p.prerequisites],
    learningObjectives: [...p.learningObjectives],
    modules: p.modules.map((m) => ({
      title: m.title,
      description: m.description,
      estimatedMinutes: m.estimatedMinutes,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        summary: l.summary,
        contentType: l.contentType,
        estimatedMinutes: l.estimatedMinutes,
        order: l.order,
      })),
    })),
    relatedChallenges: [...p.relatedChallenges],
    relatedTools: [...p.relatedTools],
  }
}

function toMissionSummary(m: CTFMission): PublicMissionSummary {
  return {
    slug: m.slug,
    title: m.title,
    shortDescription: m.shortDescription,
    category: m.category,
    difficulty: m.difficulty,
    estimatedMinutes: m.estimatedMinutes,
    points: m.points,
    order: m.order,
  }
}

function toPublicMission(m: CTFMission): PublicMission {
  return {
    ...toMissionSummary(m),
    description: m.description,
    briefing: {
      scenario: m.briefing.scenario,
      objective: m.briefing.objective,
      scope: m.briefing.scope,
    },
    objectives: [...m.objectives],
    prerequisites: [...m.prerequisites],
    stages: m.stages.map((s) => ({
      title: s.title,
      description: s.description,
      objective: s.objective,
      order: s.order,
      required: s.required,
      challengeSlugs: [...s.challengeSlugs],
    })),
    challengeSlugs: [...m.challengeSlugs],
    toolSlugs: [...m.toolSlugs],
    learningPathSlugs: [...m.learningPathSlugs],
  }
}

/* -------------------------------------------------------------------------- */
/* Published, ordered content                                                 */
/* -------------------------------------------------------------------------- */

const publishedLearning = learningPaths
  .filter((p) => p.status === "available")
  .sort((a, b) => a.order - b.order)

const publishedMissions = missions
  .filter((m) => m.status === "available")
  .sort((a, b) => a.order - b.order)

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export const catalogService = {
  listChallenges(): PublicChallenge[] {
    return challenges.map(toPublicChallenge)
  },

  getChallenge(slug: string): PublicChallenge | undefined {
    const found = challenges.find((c) => c.slug === slug)
    return found ? toPublicChallenge(found) : undefined
  },

  /** Challenge detail (adds safe objectives). Never exposes hints/flags/ids. */
  getChallengeDetail(slug: string): PublicChallengeDetail | undefined {
    const found = challenges.find((c) => c.slug === slug)
    if (!found) return undefined
    return { ...toPublicChallenge(found), objectives: [...found.objectives] }
  },

  listLearningPaths(): PublicLearningPathSummary[] {
    return publishedLearning.map(toLearningSummary)
  },

  getLearningPath(slug: string): PublicLearningPath | undefined {
    const found = publishedLearning.find((p) => p.slug === slug)
    return found ? toPublicLearningPath(found) : undefined
  },

  listMissions(): PublicMissionSummary[] {
    return publishedMissions.map(toMissionSummary)
  },

  getMission(slug: string): PublicMission | undefined {
    const found = publishedMissions.find((m) => m.slug === slug)
    return found ? toPublicMission(found) : undefined
  },

  /**
   * Whether a challenge slug refers to a real catalog challenge that supports a
   * training environment. In Phase 9 every catalog challenge is environment-
   * eligible; this stays centralized so a future "no environment for this
   * target" rule has one place to live.
   */
  challengeSupportsEnvironment(slug: string): boolean {
    return challenges.some((c) => c.slug === slug)
  },

  /** Whether a published mission slug supports a training environment. */
  missionSupportsEnvironment(slug: string): boolean {
    return publishedMissions.some((m) => m.slug === slug)
  },
}
