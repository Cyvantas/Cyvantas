import { Link } from "react-router-dom"
import { Card, CardTitle } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { StatusDot } from "../ui/StatusDot"
import { cn } from "../../lib/cn"
import type { Challenge } from "../../models/challenge"
import { CATEGORY_LABEL, DIFFICULTY_TONE, STATUS_META } from "../../lib/challengeDisplay"

interface ChallengeCardProps {
  challenge: Challenge
  /** When set, the whole card becomes a link to this path. */
  to?: string
  /** Render the tag row (used in the browser; omitted on the dashboard). */
  showTags?: boolean
}

const cardLink =
  "group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/**
 * Presentational challenge card. Pass `to` to make it navigable; otherwise it
 * renders as a static panel (dashboard usage). Reuses shared display maps so
 * category/difficulty/status styling stays consistent across the app.
 */
export function ChallengeCard({ challenge, to, showTags = false }: ChallengeCardProps) {
  const meta = STATUS_META[challenge.status]

  const body = (
    <Card interactive className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <Badge tone="cyan">{CATEGORY_LABEL[challenge.category]}</Badge>
        <StatusDot status={meta.status} label={meta.label} />
      </div>
      <div className="flex flex-col gap-2">
        <CardTitle className="text-base">{challenge.title}</CardTitle>
        <p className="text-body text-sm text-muted">{challenge.description}</p>
      </div>
      {showTags && challenge.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {challenge.tags.map((tag) => (
            <li key={tag}>
              <Badge tone="neutral">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <Badge tone={DIFFICULTY_TONE[challenge.difficulty]}>{challenge.difficulty}</Badge>
        <span className="text-technical text-dim">{challenge.points} pts</span>
        <span className="text-technical text-dim">~{challenge.estimatedMinutes} min</span>
      </div>
    </Card>
  )

  if (!to) return body

  return (
    <Link
      to={to}
      className={cn(cardLink)}
      aria-label={`${challenge.title} — ${CATEGORY_LABEL[challenge.category]} challenge`}
    >
      {body}
    </Link>
  )
}
