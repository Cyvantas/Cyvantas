import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "../../lib/cn"
import { duration, easing } from "../../lib/motion"

/**
 * Progressive hints. Each hint is collapsed by default and revealed
 * individually via an accessible disclosure button with a subtle transition.
 */
export function Hints({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set())

  if (hints.length === 0) return null

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <ol className="flex flex-col gap-3">
      {hints.map((hint, index) => {
        const isOpen = open.has(index)
        const panelId = `hint-panel-${index}`
        return (
          <li key={index}>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
                  "transition-colors hover:bg-surface-elevated",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  "focus-visible:ring-inset",
                )}
              >
                <span className="text-sm font-medium text-foreground">Hint {index + 1}</span>
                <span className="text-technical text-dim">{isOpen ? "Hide" : "Reveal"}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    id={panelId}
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: duration.micro, ease: easing.out }}
                    className="overflow-hidden"
                  >
                    <p className="text-body px-4 pb-4 text-sm text-muted">{hint}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
