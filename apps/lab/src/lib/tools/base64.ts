import type { ToolResult } from "./result";
import { ok, err } from "./result";
import { textToBase64, base64ToText, isValidBase64 } from "./encoding";

/** Encode text as standard Base64 (UTF-8 safe). Never fails for text input. */
export function encodeBase64(text: string): ToolResult<string> {
  try {
    return ok(textToBase64(text));
  } catch {
    return err("Unable to encode this input.");
  }
}

/** Decode standard Base64 to UTF-8 text, reporting malformed input clearly. */
export function decodeBase64(input: string): ToolResult<string> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return err("Enter Base64 to decode.");
  if (!isValidBase64(trimmed)) {
    return err("Not valid Base64. Check for stray characters or incorrect padding.");
  }
  try {
    return ok(base64ToText(trimmed));
  } catch {
    return err("Not valid Base64. Check for stray characters or incorrect padding.");
  }
}
