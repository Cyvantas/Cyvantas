import { useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Badge } from "../ui/Badge"
import { cn } from "../../lib/cn"
import { duration, easing } from "../../lib/motion"
import type { MissionStage as MissionStageModel } from "../../models/ctf"

export interface ResolvedStageLink {
  slug: string
  label: string
}

interface MissionStageProps {
  stage: MissionStageModel
  /** 1-based display index. */
  index: number
  /** Resolved related-challenge links for this stage. */
  challengeLinks: ResolvedStageLink[]
  defaultOpen?: boolean
}

const chipLink =
  "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm " +
  "text-muted transition-colors hover:border-accent-line hover:text-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/**
 * Reusable mission stage. Collapsible (progressive disclosure) with an
 * accessible toggle. Because progress is not persisted, every stage is honestly
 * "Available"; the required/optional badge reflects mission structure, not
 * completion.
 */
export function MissionStage({
  stage,
  index,
  challengeLinks,
  defaultOpen = false,
}: MissionStageProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `stage-panel-${stage.id}`
  const number = String(index).padStart(2, "0")

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-start justify-between gap-4 px-5 py-4 text-left",
          "transition-colors hover:bg-surface-elevated",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
        )}
      >
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="mt-0.5 font-mono text-sm text-accent">
            {number}
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-technical text-dim">Stage {number}</span>
            <span className="font-display text-base font-semibold text-foreground">
              {stage.title}
            </span>
            <span className="text-body text-sm text-muted">{stage.objective}</span>
          </div>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone="neutral">{stage.required ? "Required" : "Optional"}</Badge>
          <span className="text-technical text-dim">{open ? "Hide" : "View"}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.micro, ease: easing.out }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-border-subtle px-5 py-5">
              <p className="text-body text-sm text-muted">{stage.description}</p>

              {challengeLinks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-technical text-dim">Practise with challenges</span>
                  <ul className="flex flex-wrap gap-2">
                    {challengeLinks.map((link) => (
                      <li key={link.slug}>
                        <Link to={`/challenges/${link.slug}`} className={chipLink}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
