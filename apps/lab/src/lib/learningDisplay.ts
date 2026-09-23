/**
 * Presentation maps for learning paths, shared by the card, browser, and
 * detail page. Kept separate from filtering logic and the data source so a
 * backend can replace `data/learningPaths` without touching display concerns.
 */
import type {
  LearningCategory,
  LearningDifficulty,
  LessonContentType,
} from "../models/learning"

export const LEARNING_CATEGORY_LABEL: Record<LearningCategory, string> = {
  fundamentals: "Fundamentals",
  web: "Web Security",
  authentication: "Authentication",
  api: "API Security",
  "access-control": "Access Control",
  recon: "Recon",
  testing: "Testing",
}

/** Difficulty → Badge tone (color is always paired with the difficulty label). */
export const LEARNING_DIFFICULTY_TONE: Record<
  LearningDifficulty,
  "green" | "medium" | "high"
> = {
  beginner: "green",
  intermediate: "medium",
  advanced: "high",
}

export const CONTENT_TYPE_LABEL: Record<LessonContentType, string> = {
  concept: "Concept",
  walkthrough: "Walkthrough",
  checklist: "Checklist",
  lab: "Lab",
  challenge: "Challenge",
  review: "Review",
}

/** Format an estimated duration in minutes as a compact "~Xh Ym" string. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `~${hours} hr` : `~${hours} hr ${rest} min`
}
