import { Badge } from "../ui/Badge"
import { SectionTitle } from "../ui/SectionTitle"
import type { LearningPath } from "../../models/learning"
import {
  LEARNING_CATEGORY_LABEL,
  LEARNING_DIFFICULTY_TONE,
  formatDuration,
} from "../../lib/learningDisplay"
import { countLessons } from "../../lib/learningFilters"

interface LearningPathHeaderProps {
  path: LearningPath
}

/** Detail-page header: category / difficulty badges, title, description, meta. */
export function LearningPathHeader({ path }: LearningPathHeaderProps) {
  const moduleCount = path.modules.length
  const lessonCount = countLessons(path)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cyan">{LEARNING_CATEGORY_LABEL[path.category]}</Badge>
        <Badge tone={LEARNING_DIFFICULTY_TONE[path.difficulty]}>{path.difficulty}</Badge>
      </div>
      <SectionTitle as="h1" eyebrow="Learning path" title={path.title} />
      <p className="text-body max-w-[65ch] text-muted">{path.description}</p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-technical text-dim">
          {moduleCount} {moduleCount === 1 ? "module" : "modules"}
        </span>
        <span className="text-technical text-dim">
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
        </span>
        <span className="text-technical text-dim">{formatDuration(path.estimatedMinutes)}</span>
      </div>
    </>
  )
}
