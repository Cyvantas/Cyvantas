import type { ToolResult } from "./result";
import { ok, err } from "./result";

/** Parse then re-serialize JSON with a 2-space indent. */
export function formatJson(input: string): ToolResult<string> {
  return transform(input, (value) => JSON.stringify(value, null, 2));
}

/** Parse then re-serialize JSON with no whitespace. */
export function minifyJson(input: string): ToolResult<string> {
  return transform(input, (value) => JSON.stringify(value));
}

function transform(
  input: string,
  serialize: (value: unknown) => string,
): ToolResult<string> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return err("Enter JSON to process.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return err(describeParseError(error));
  }
  return ok(serialize(parsed));
}

/** Surface the engine's parse message (it usually includes a position). */
function describeParseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Invalid JSON: ${message}`;
}
