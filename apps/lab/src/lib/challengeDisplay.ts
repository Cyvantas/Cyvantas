/**
 * Presentation maps shared by the challenge card, browser, and detail page.
 * Kept separate from filtering logic and from the data source so a real
 * backend can replace `data/challenges` without touching display concerns.
 */
import type { ChallengeCategory, ChallengeStatus, Difficulty } from "../models/challenge"

export const CATEGORY_LABEL: Record<ChallengeCategory, string> = {
  web: "Web Security",
  authentication: "Authentication",
  api: "API Security",
  recon: "Recon",
  cloud: "Cloud Security",
  mobile: "Mobile Security",
  ctf: "CTF",
}

/** Difficulty → Badge tone (color is always paired with the difficulty label). */
export const DIFFICULTY_TONE: Record<Difficulty, "green" | "medium" | "high" | "critical"> = {
  beginner: "green",
  easy: "green",
  medium: "medium",
  hard: "high",
  expert: "critical",
}

export const STATUS_META: Record<
  ChallengeStatus,
  { status: "online" | "active" | "idle"; label: string }
> = {
  completed: { status: "online", label: "Completed" },
  "in-progress": { status: "active", label: "In progress" },
  available: { status: "idle", label: "Available" },
  locked: { status: "idle", label: "Locked" },
}
