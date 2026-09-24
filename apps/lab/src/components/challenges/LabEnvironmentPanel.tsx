import { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { Eyebrow } from "../ui/SectionTitle"
import { StatusDot } from "../ui/StatusDot"
import {
  challengeEnvironmentProvider,
  type ChallengeEnvironment,
} from "../../providers/ChallengeEnvironmentProvider"

interface LabEnvironmentPanelProps {
  /** Challenge whose environment this panel represents. */
  challengeSlug: string
}

/**
 * Provider-driven lab-environment panel. It reads state from the challenge
 * environment provider rather than hardcoding it. In this build the provider is
 * the honest stub (`supportsProvisioning=false`), so the panel makes the
 * "no running target yet" state explicit instead of faking a live sandbox.
 */
export function LabEnvironmentPanel({ challengeSlug }: LabEnvironmentPanelProps) {
  const [environment, setEnvironment] = useState<ChallengeEnvironment | null>(null)

  useEffect(() => {
    let active = true
    challengeEnvironmentProvider.getEnvironment(challengeSlug).then((env) => {
      if (active) setEnvironment(env ?? null)
    })
    return () => {
      active = false
    }
  }, [challengeSlug])

  const provisionable = challengeEnvironmentProvider.supportsProvisioning
  const isReady = environment?.status === "ready" && environment.runtimeConfigured

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Lab Environment</Eyebrow>
      <StatusDot
        status={isReady ? "online" : "idle"}
        label={isReady ? "Environment ready" : "Environment not provisioned"}
      />
      {provisionable ? (
        <p className="text-body text-sm text-muted">
          Launch an isolated, on-demand instance of this challenge to interact with a
          controlled, sandboxed target.
        </p>
      ) : (
        <p className="text-body text-sm text-muted">
          This challenge does not yet have an interactive target. Isolated, on-demand
          lab environments — where you will be able to launch and interact with a
          controlled, sandboxed instance — will be introduced in a later phase. For now,
          use the objectives and hints to study the vulnerability conceptually.
        </p>
      )}
    </Card>
  )
}
