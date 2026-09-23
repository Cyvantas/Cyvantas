import { useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Badge } from "../ui/Badge"
import { cn } from "../../lib/cn"
import { duration, easing } from "../../lib/motion"
import type { LearningModule as LearningModuleModel } from "../../models/learning"
import { CONTENT_TYPE_LABEL, formatDuration } from "../../lib/learningDisplay"
import { learningProgressProvider } from "../../providers/LearningProgressProvider"

export interface ResolvedLink {
  slug: string
  label: string
}

interface LearningModuleProps {
  module: LearningModuleModel
  /** 1-based display index. */
  index: number
  challengeLinks: ResolvedLink[]
  toolLinks: ResolvedLink[]
  defaultOpen?: boolean
}

const chipLink =
  "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm " +
  "text-muted transition-colors hover:border-accent-line hover:text-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/**
 * Reusable curriculum module. Collapsible (progressive disclosure) with an
 * accessible toggle. Completion state comes from the progress provider — with
 * the current no-op provider every module is honestly "Available".
 */
export function LearningModule({
  module,
  index,
  challengeLinks,
  toolLinks,
  defaultOpen = false,
}: LearningModuleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `module-panel-${module.id}`
  const number = String(index).padStart(2, "0")
  const state = learningProgressProvider.getModuleProgress(module.id)

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
          <span
            aria-hidden="true"
            className="mt-0.5 font-mono text-sm text-accent"
          >
            {number}
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-base font-semibold text-foreground">
              {module.title}
            </span>
            <span className="text-body text-sm text-muted">{module.description}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-technical text-dim">
                {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
              </span>
              <span className="text-technical text-dim">
                {formatDuration(module.estimatedMinutes)}
              </span>
            </span>
          </div>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone="neutral">{state === "completed" ? "Completed" : "Available"}</Badge>
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
            <div className="flex flex-col gap-5 border-t border-border-subtle px-5 py-5">
              <ol className="flex flex-col gap-3">
                {module.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex flex-col gap-1 rounded-md border border-border-subtle bg-surface-elevated px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{lesson.title}</span>
                      <span className="flex items-center gap-2">
                        <Badge tone="cyan">{CONTENT_TYPE_LABEL[lesson.contentType]}</Badge>
                        <span className="text-technical text-dim">
                          {formatDuration(lesson.estimatedMinutes)}
                        </span>
                      </span>
                    </div>
                    <p className="text-body text-sm text-muted">{lesson.summary}</p>
                  </li>
                ))}
              </ol>

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

              {toolLinks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-technical text-dim">Use these tools</span>
                  <ul className="flex flex-wrap gap-2">
                    {toolLinks.map((link) => (
                      <li key={link.slug}>
                        <Link to={`/tools/${link.slug}`} className={chipLink}>
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
