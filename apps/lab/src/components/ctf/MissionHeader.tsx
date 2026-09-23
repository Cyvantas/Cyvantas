import { Badge } from "../ui/Badge"
import { StatusDot } from "../ui/StatusDot"
import { SectionTitle } from "../ui/SectionTitle"
import type { CTFMission, MissionStatus } from "../../models/ctf"
import {
  MISSION_CATEGORY_LABEL,
  MISSION_DIFFICULTY_TONE,
  MISSION_STATUS_META,
  formatMissionDuration,
} from "../../lib/missionDisplay"

interface MissionHeaderProps {
  mission: CTFMission
  status: MissionStatus
}

/** Detail-page header: category / difficulty / status, title, description, meta. */
export function MissionHeader({ mission, status }: MissionHeaderProps) {
  const stageCount = mission.stages.length
  const meta = MISSION_STATUS_META[status]

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cyan">{MISSION_CATEGORY_LABEL[mission.category]}</Badge>
        <Badge tone={MISSION_DIFFICULTY_TONE[mission.difficulty]}>{mission.difficulty}</Badge>
        <StatusDot status={meta.status} label={meta.label} />
      </div>
      <SectionTitle as="h1" eyebrow="CTF Mission" title={mission.title} />
      <p className="text-body max-w-[65ch] text-muted">{mission.description}</p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-technical text-dim">{mission.points} pts</span>
        <span className="text-technical text-dim">
          {formatMissionDuration(mission.estimatedMinutes)}
        </span>
        <span className="text-technical text-dim">
          {stageCount} {stageCount === 1 ? "stage" : "stages"}
        </span>
      </div>
    </>
  )
}
