import { Card } from "../ui/Card"
import { Eyebrow } from "../ui/SectionTitle"
import { StatusDot } from "../ui/StatusDot"

/**
 * Honest placeholder for the interactive lab environment. There is no running
 * target — isolated, provisioned environments are a later phase. This panel
 * intentionally makes that state explicit rather than faking a live target.
 */
export function LabEnvironmentPanel() {
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Lab Environment</Eyebrow>
      <StatusDot status="idle" label="Environment not provisioned" />
      <p className="text-body text-sm text-muted">
        This challenge does not yet have an interactive target. Isolated, on-demand
        lab environments — where you will be able to launch and interact with a
        controlled, sandboxed instance — will be introduced in a later phase. For now,
        use the objectives and hints to study the vulnerability conceptually.
      </p>
    </Card>
  )
}
