import { cn } from "../../lib/cn"
import type {
  DurationFilter,
  LearningCategoryFilter,
  LearningDifficultyFilter,
} from "../../lib/learningFilters"
import {
  DURATION_FILTERS,
  LEARNING_CATEGORY_FILTERS,
  LEARNING_DIFFICULTY_FILTERS,
} from "../../lib/learningFilters"

const pillBase =
  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const pillActive = "border-accent-line bg-accent-soft text-accent"
const pillIdle = "border-border text-muted hover:border-accent-line hover:text-foreground"

interface FilterGroupProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

function FilterGroup<T extends string>({ label, options, value, onChange }: FilterGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-technical text-dim">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(pillBase, active ? pillActive : pillIdle)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface LearningFiltersProps {
  category: LearningCategoryFilter
  onCategoryChange: (value: LearningCategoryFilter) => void
  difficulty: LearningDifficultyFilter
  onDifficultyChange: (value: LearningDifficultyFilter) => void
  duration: DurationFilter
  onDurationChange: (value: DurationFilter) => void
  query: string
  onQueryChange: (value: string) => void
}

/** Search + category + difficulty + duration controls. Filtering lives in lib. */
export function LearningFilters({
  category,
  onCategoryChange,
  difficulty,
  onDifficultyChange,
  duration,
  onDurationChange,
  query,
  onQueryChange,
}: LearningFiltersProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="learning-search" className="text-technical text-dim">
          Search
        </label>
        <input
          id="learning-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by title, topic, or objective"
          autoComplete="off"
          className={cn(
            "w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-foreground",
            "placeholder:text-dim transition-colors hover:border-accent-line",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        />
      </div>
      <FilterGroup
        label="Category"
        options={LEARNING_CATEGORY_FILTERS}
        value={category}
        onChange={onCategoryChange}
      />
      <FilterGroup
        label="Difficulty"
        options={LEARNING_DIFFICULTY_FILTERS}
        value={difficulty}
        onChange={onDifficultyChange}
      />
      <FilterGroup
        label="Duration"
        options={DURATION_FILTERS}
        value={duration}
        onChange={onDurationChange}
      />
    </div>
  )
}
