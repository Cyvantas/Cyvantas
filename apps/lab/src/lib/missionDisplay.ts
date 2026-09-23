/**
 * Presentation maps for CTF missions, shared by the card, browser, and detail
 * page. Kept separate from filtering logic and the data source so a backend can
 * replace `data/missions` without touching display concerns.
 */
import type {
  MissionCategory,
  MissionDifficulty,
  MissionStatus,
} from "../models/ctf"

export const MISSION_CATEGORY_LABEL: Record<MissionCategory, string> = {
  recon: "Recon",
  web: "Web Security",
  authentication: "Authentication",
  "access-control": "Access Control",
  api: "API Security",
  defensive: "Defensive",
}

/** Difficulty → Badge tone (color is always paired with the difficulty label). */
export const MISSION_DIFFICULTY_TONE: Record<
  MissionDifficulty,
  "green" | "medium" | "high"
> = {
  beginner: "green",
  intermediate: "medium",
  advanced: "high",
}

/** Runtime status → StatusDot status + label (meaning never relies on color). */
export const MISSION_STATUS_META: Record<
  MissionStatus,
  { status: "online" | "active" | "idle"; label: string }
> = {
  completed: { status: "online", label: "Completed" },
  "in-progress": { status: "active", label: "In progress" },
  available: { status: "idle", label: "Available" },
}

/** Format an estimated duration in minutes as a compact "~Xh Ym" string. */
export function formatMissionDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `~${hours} hr` : `~${hours} hr ${rest} min`
}
