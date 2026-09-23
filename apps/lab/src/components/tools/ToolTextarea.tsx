import { useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ToolTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  /** Optional helper text rendered under the label. */
  hint?: string;
}

const fieldClass =
  "w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 " +
  "font-mono text-sm text-foreground placeholder:text-dim transition-colors " +
  "hover:border-accent-line focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Labeled monospace textarea for tool input. */
export function ToolTextarea({
  label,
  hint,
  rows = 6,
  className,
  ...props
}: ToolTextareaProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-technical text-dim">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-caption">
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        aria-describedby={hintId}
        className={cn(fieldClass, className)}
        {...props}
      />
    </div>
  );
}
