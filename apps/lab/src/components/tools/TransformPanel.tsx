import { useMemo, useState } from "react";
import type { ToolResult } from "../../lib/tools/result";
import { ToolTextarea } from "./ToolTextarea";
import { SegmentedControl } from "./SegmentedControl";
import { StringResult } from "./ToolStates";
import { Button } from "../ui/Button";

interface TransformPanelProps<M extends string> {
  inputLabel: string;
  inputHint?: string;
  placeholder?: string;
  modeLabel: string;
  modes: { value: M; label: string }[];
  initialMode: M;
  /** Pure transform. Return an error result for invalid input. */
  run: (input: string, mode: M) => ToolResult<string>;
  outputLabel: (mode: M) => string;
  /** Placeholder text before any input is entered. */
  idle: string;
}

/**
 * Shared layout for string-in / string-out tools (Base64, URL, JSON). The
 * transform runs synchronously as the user types — everything stays local.
 */
export function TransformPanel<M extends string>({
  inputLabel,
  inputHint,
  placeholder,
  modeLabel,
  modes,
  initialMode,
  run,
  outputLabel,
  idle,
}: TransformPanelProps<M>) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<M>(initialMode);

  const result = useMemo<ToolResult<string> | null>(
    () => (input.length === 0 ? null : run(input, mode)),
    [input, mode, run],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-technical text-dim">{modeLabel}</span>
          <SegmentedControl label={modeLabel} options={modes} value={mode} onChange={setMode} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInput("")}
          disabled={input.length === 0}
        >
          Clear
        </Button>
      </div>

      <ToolTextarea
        label={inputLabel}
        hint={inputHint}
        placeholder={placeholder}
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />

      <StringResult result={result} label={outputLabel(mode)} idle={idle} />
    </div>
  );
}
