/**
 * Shared result type for the browser security tools. Utilities return a
 * discriminated union rather than throwing, so panels can render a clear
 * error state without try/catch scattered through the UI.
 */
export type ToolResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const ok = <T>(value: T): ToolResult<T> => ({ ok: true, value });
export const err = <T = never>(error: string): ToolResult<T> => ({ ok: false, error });
