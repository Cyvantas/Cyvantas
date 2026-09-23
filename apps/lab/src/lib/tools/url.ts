import type { ToolResult } from "./result";
import { ok, err } from "./result";

/** Percent-encode using encodeURIComponent semantics. */
export function encodeUrl(text: string): ToolResult<string> {
  try {
    return ok(encodeURIComponent(text));
  } catch {
    return err("Unable to encode this input.");
  }
}

/** Decode using decodeURIComponent semantics, reporting malformed sequences. */
export function decodeUrl(input: string): ToolResult<string> {
  if (input.length === 0) return err("Enter a value to decode.");
  try {
    return ok(decodeURIComponent(input));
  } catch {
    return err("Malformed URL encoding — check for invalid % sequences.");
  }
}
