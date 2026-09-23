import { TransformPanel } from "./TransformPanel";
import { encodeUrl, decodeUrl } from "../../lib/tools/url";
import type { ToolResult } from "../../lib/tools/result";

type Mode = "encode" | "decode";

const run = (input: string, mode: Mode): ToolResult<string> =>
  mode === "encode" ? encodeUrl(input) : decodeUrl(input);

const outputLabel = (mode: Mode) => (mode === "encode" ? "Encoded" : "Decoded");

export function UrlPanel() {
  return (
    <TransformPanel<Mode>
      modeLabel="Mode"
      modes={[
        { value: "encode", label: "Encode" },
        { value: "decode", label: "Decode" },
      ]}
      initialMode="encode"
      inputLabel="Input"
      inputHint="Uses encodeURIComponent / decodeURIComponent semantics."
      placeholder="Value to encode or decode…"
      run={run}
      outputLabel={outputLabel}
      idle="Enter a value to see the result here."
    />
  );
}
