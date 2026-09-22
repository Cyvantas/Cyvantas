import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface FieldOwnProps {
  label: string;
  /** Hide the visible label but keep it for screen readers. */
  hideLabel?: boolean;
  helperText?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export interface FieldRenderArgs {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

interface FieldFrameProps extends FieldOwnProps {
  fieldId: string;
  children: (args: FieldRenderArgs) => ReactNode;
}

/** Shared label / helper / error scaffolding for form controls. */
export function FieldFrame({
  label,
  hideLabel = false,
  helperText,
  error,
  required = false,
  fieldId,
  className,
  children,
}: FieldFrameProps) {
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={fieldId}
        className={cn("text-sm font-medium text-foreground", hideLabel && "sr-only")}
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({ id: fieldId, describedBy, invalid: Boolean(error) })}

      {helperText ? (
        <p id={helperId} className="text-caption">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared control classes for input-like elements. */
export const controlClass =
  "w-full min-h-11 rounded-md border border-border bg-surface px-3 py-2 " +
  "text-foreground placeholder:text-dim " +
  "transition-[border-color,box-shadow] duration-200 " +
  "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-line " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/40";
