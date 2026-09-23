import { TransformPanel } from "./TransformPanel";
import { formatJson, minifyJson } from "../../lib/tools/json";
import type { ToolResult } from "../../lib/tools/result";

type Mode = "format" | "minify";

const run = (input: string, mode: Mode): ToolResult<string> =>
  mode === "format" ? formatJson(input) : minifyJson(input);

const outputLabel = (mode: Mode) => (mode === "format" ? "Formatted JSON" : "Minified JSON");

export function JsonPanel() {
  return (
    <TransformPanel<Mode>
      modeLabel="Action"
      modes={[
        { value: "format", label: "Pretty-print" },
        { value: "minify", label: "Minify" },
      ]}
      initialMode="format"
      inputLabel="JSON"
      placeholder='{"example": true}'
      run={run}
      outputLabel={outputLabel}
      idle="Paste JSON to validate and reformat it here."
    />
  );
}
