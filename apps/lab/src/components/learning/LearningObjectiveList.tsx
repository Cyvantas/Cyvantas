import { Stagger, StaggerItem } from "../motion/Reveal"

interface LearningObjectiveListProps {
  objectives: string[]
}

/** Numbered list of learning objectives, matching the challenge objective style. */
export function LearningObjectiveList({ objectives }: LearningObjectiveListProps) {
  return (
    <Stagger as="ol" className="flex flex-col gap-3">
      {objectives.map((objective, index) => (
        <StaggerItem
          as="li"
          key={index}
          className="flex items-start gap-3 text-body text-muted"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated font-mono text-xs text-accent"
          >
            {index + 1}
          </span>
          <span>{objective}</span>
        </StaggerItem>
      ))}
    </Stagger>
  )
}
