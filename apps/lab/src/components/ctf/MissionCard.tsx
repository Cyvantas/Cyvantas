import { Link } from "react-router-dom"
import { Card, CardTitle } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { StatusDot } from "../ui/StatusDot"
import { cn } from "../../lib/cn"
import type { CTFMission } from "../../models/ctf"
import {
  MISSION_CATEGORY_LABEL,
  MISSION_DIFFICULTY_TONE,
  MISSION_STATUS_META,
  formatMissionDuration,
} from "../../lib/missionDisplay"
import { missionProgressProvider } from "../../providers/MissionProgressProvider"

interface MissionCardProps {
  mission: CTFMission
  /** When set, the whole card becomes a link to this mission. */
  to?: string
}

const cardLink =
  "group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/**
 * Presentational mission card. Pass `to` to make it navigable; otherwise it
 * renders as a static panel (dashboard usage). Status comes from the progress
 * provider — with the current no-op provider every mission is "Available".
 */
export function MissionCard({ mission, to }: MissionCardProps) {
  const stageCount = mission.stages.length
  const status = missionProgressProvider.getMissionStatus(mission.id)
  const meta = MISSION_STATUS_META[status]

  const body = (
    <Card interactive className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <Badge tone="cyan">{MISSION_CATEGORY_LABEL[mission.category]}</Badge>
        <StatusDot status={meta.status} label={meta.label} />
      </div>
      <div className="flex flex-col gap-2">
        <CardTitle className="text-base">{mission.title}</CardTitle>
        <p className="text-body text-sm text-muted">{mission.shortDescription}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <Badge tone={MISSION_DIFFICULTY_TONE[mission.difficulty]}>{mission.difficulty}</Badge>
        <span className="text-technical text-dim">{mission.points} pts</span>
        <span className="text-technical text-dim">
          {formatMissionDuration(mission.estimatedMinutes)}
        </span>
        <span className="text-technical text-dim">
          {stageCount} {stageCount === 1 ? "stage" : "stages"}
        </span>
      </div>
    </Card>
  )

  if (!to) return body

  return (
    <Link
      to={to}
      className={cn(cardLink)}
      aria-label={`${mission.title} — ${MISSION_CATEGORY_LABEL[mission.category]} mission`}
    >
      {body}
    </Link>
  )
}
