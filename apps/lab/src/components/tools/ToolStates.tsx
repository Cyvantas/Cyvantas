import type { ReactNode } from "react";
import type { ToolResult } from "../../lib/tools/result";
import { CopyButton } from "./CopyButton";
import { cn } from "../../lib/cn";

/** Neutral placeholder shown before the user has entered anything. */
export function ToolEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface/40 px-4 py-6 text-center">
      <p className="text-body text-sm text-muted">{children}</p>
    </div>
  );
}

/** Error state. `role="alert"` announces the message to assistive tech. */
export function ToolError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {children}
    </div>
  );
}

interface OutputBlockProps {
  label: string;
  value: string;
  copyLabel?: string;
  className?: string;
}

/** Read-only, monospace output with a header row and copy control. */
export function OutputBlock({ label, value, copyLabel, className }: OutputBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-technical text-dim">{label}</span>
        <CopyButton value={value} label={copyLabel ?? label.toLowerCase()} />
      </div>
      <pre
        className={cn(
          "max-h-[28rem] overflow-auto rounded-md border border-border bg-surface px-3 py-2.5",
          "font-mono text-sm text-foreground whitespace-pre-wrap break-words",
          className,
        )}
      >
        {value}
      </pre>
    </div>
  );
}

interface StringResultProps {
  /** `null` renders the idle empty state (no input yet). */
  result: ToolResult<string> | null;
  label: string;
  idle: ReactNode;
}

/** Renders idle / error / success for tools whose output is a single string. */
export function StringResult({ result, label, idle }: StringResultProps) {
  if (result === null) return <ToolEmpty>{idle}</ToolEmpty>;
  if (!result.ok) return <ToolError>{result.error}</ToolError>;
  return <OutputBlock label={label} value={result.value} />;
}
