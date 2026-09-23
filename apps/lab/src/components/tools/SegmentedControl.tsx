import { cn } from "../../lib/cn";

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Group label for assistive tech. */
  label: string;
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

const pillBase =
  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const pillActive = "border-accent-line bg-accent-soft text-accent";
const pillIdle = "border-border text-muted hover:border-accent-line hover:text-foreground";

/** Small segmented control for mode switches (e.g. Encode / Decode). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
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
        );
      })}
    </div>
  );
}
