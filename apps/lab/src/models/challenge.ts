export type ChallengeCategory =
  | "web"
  | "authentication"
  | "api"
  | "recon"
  | "cloud"
  | "mobile"
  | "ctf"

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "expert"

export type ChallengeStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "completed"

export interface Challenge {
  id: string
  slug: string
  title: string
  description: string
  category: ChallengeCategory
  difficulty: Difficulty
  points: number
  estimatedMinutes: number
  status: ChallengeStatus
  objectives: string[]
  hints: string[]
  tags: string[]
}
