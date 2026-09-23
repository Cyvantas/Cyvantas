import { Link } from "react-router-dom"
import { Card, CardTitle } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { cn } from "../../lib/cn"
import type { LearningPath } from "../../models/learning"
import {
  LEARNING_CATEGORY_LABEL,
  LEARNING_DIFFICULTY_TONE,
  formatDuration,
} from "../../lib/learningDisplay"
import { countLessons } from "../../lib/learningFilters"

interface LearningCardProps {
  path: LearningPath
  /** When set, the whole card becomes a link to this path. */
  to?: string
}

const cardLink =
  "group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/**
 * Presentational learning-path card. Pass `to` to make it navigable; otherwise
 * it renders as a static panel. Reuses shared display maps so category /
 * difficulty styling stays consistent with the challenge cards.
 */
export function LearningCard({ path, to }: LearningCardProps) {
  const moduleCount = path.modules.length
  const lessonCount = countLessons(path)

  const body = (
    <Card interactive className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <Badge tone="cyan">{LEARNING_CATEGORY_LABEL[path.category]}</Badge>
        <Badge tone={LEARNING_DIFFICULTY_TONE[path.difficulty]}>{path.difficulty}</Badge>
      </div>
      <div className="flex flex-col gap-2">
        <CardTitle className="text-base">{path.title}</CardTitle>
        <p className="text-body text-sm text-muted">{path.shortDescription}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
        <span className="text-technical text-dim">
          {moduleCount} {moduleCount === 1 ? "module" : "modules"}
        </span>
        <span className="text-technical text-dim">
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
        </span>
        <span className="text-technical text-dim">{formatDuration(path.estimatedMinutes)}</span>
      </div>
    </Card>
  )

  if (!to) return body

  return (
    <Link
      to={to}
      className={cn(cardLink)}
      aria-label={`${path.title} — ${LEARNING_CATEGORY_LABEL[path.category]} learning path`}
    >
      {body}
    </Link>
  )
}
