import { TransformPanel } from "./TransformPanel";
import { encodeBase64, decodeBase64 } from "../../lib/tools/base64";
import type { ToolResult } from "../../lib/tools/result";

type Mode = "encode" | "decode";

const run = (input: string, mode: Mode): ToolResult<string> =>
  mode === "encode" ? encodeBase64(input) : decodeBase64(input);

const outputLabel = (mode: Mode) => (mode === "encode" ? "Base64" : "Decoded text");

export function Base64Panel() {
  return (
    <TransformPanel<Mode>
      modeLabel="Mode"
      modes={[
        { value: "encode", label: "Encode" },
        { value: "decode", label: "Decode" },
      ]}
      initialMode="encode"
      inputLabel="Input"
      placeholder="Text to encode, or Base64 to decode…"
      run={run}
      outputLabel={outputLabel}
      idle="Enter text or Base64 to see the result here."
    />
  );
}
