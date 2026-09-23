import { Card } from "../ui/Card"
import { Eyebrow } from "../ui/SectionTitle"
import type { MissionBriefing as MissionBriefingModel } from "../../models/ctf"

interface MissionBriefingProps {
  briefing: MissionBriefingModel
}

/**
 * Scenario-driven briefing panel for a mission. Deliberately frames every
 * mission as an authorized, controlled training exercise — no real targets.
 */
export function MissionBriefing({ briefing }: MissionBriefingProps) {
  return (
    <Card className="flex flex-col gap-5">
      <Eyebrow>Mission Briefing</Eyebrow>
      <p className="text-body max-w-[65ch] text-muted">{briefing.scenario}</p>

      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-technical text-dim">Objective</dt>
          <dd className="text-body text-sm text-foreground">{briefing.objective}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-technical text-dim">Scope</dt>
          <dd className="text-body text-sm text-muted">{briefing.scope}</dd>
        </div>
      </dl>
    </Card>
  )
}
