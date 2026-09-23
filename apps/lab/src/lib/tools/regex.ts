/**
 * Local regular-expression testing. Compiles a user pattern and runs it over
 * sample input, returning matches with indexes and capture groups. Nothing
 * leaves the browser. There is no reliable way to bound catastrophic
 * backtracking synchronously in JS, so we (a) flag patterns whose shape is a
 * common ReDoS risk and (b) cap the number of global matches and guard against
 * zero-width infinite loops.
 */

import type { ToolResult } from "./result";
import { ok, err } from "./result";

export interface RegexCapture {
  /** 1-based group number. */
  index: number;
  value: string | undefined;
}

export interface RegexMatch {
  match: string;
  index: number;
  captures: RegexCapture[];
  /** Named capture groups, when the pattern defines any. */
  namedGroups: Record<string, string | undefined>;
}

export interface RegexRunResult {
  matches: RegexMatch[];
  /** True when the match cap was reached and results were truncated. */
  truncated: boolean;
  /** Non-fatal heuristic warning about catastrophic-backtracking risk. */
  redosWarning?: string;
}

/** Upper bound on collected global matches, to keep the UI responsive. */
const MATCH_CAP = 5000;

export const SUPPORTED_FLAGS = [
  { flag: "g", label: "global", note: "Find all matches, not just the first." },
  { flag: "i", label: "ignore case", note: "Case-insensitive matching." },
  { flag: "m", label: "multiline", note: "^ and $ match line boundaries." },
  { flag: "s", label: "dotAll", note: ". also matches newlines." },
  { flag: "u", label: "unicode", note: "Treat the pattern as a sequence of Unicode code points." },
  { flag: "y", label: "sticky", note: "Match only from lastIndex." },
] as const;

/**
 * Heuristic detection of patterns prone to catastrophic backtracking, e.g.
 * nested quantifiers like (a+)+ or (a*)*. Not exhaustive — a best-effort
 * warning, not a guarantee.
 */
export function detectRedosRisk(pattern: string): string | undefined {
  const nestedQuantifier = /\([^)]*[+*][^)]*\)\s*[+*]/;
  if (nestedQuantifier.test(pattern)) {
    return "This pattern nests quantifiers (e.g. (a+)+), a common cause of catastrophic backtracking. Test with care on large inputs.";
  }
  return undefined;
}

export function runRegex(pattern: string, flags: string, input: string): ToolResult<RegexRunResult> {
  if (pattern.length === 0) return err("Enter a pattern to test.");

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(`Invalid regular expression: ${message}`);
  }

  const redosWarning = detectRedosRisk(pattern);
  const matches: RegexMatch[] = [];

  if (!regex.global) {
    const single = regex.exec(input);
    if (single) matches.push(toMatch(single));
    return ok({ matches, truncated: false, redosWarning });
  }

  let truncated = false;
  let execResult: RegExpExecArray | null;
  while ((execResult = regex.exec(input)) !== null) {
    matches.push(toMatch(execResult));
    if (matches.length >= MATCH_CAP) {
      truncated = true;
      break;
    }
    // Advance past zero-width matches to avoid an infinite loop.
    if (execResult[0].length === 0) regex.lastIndex += 1;
  }

  return ok({ matches, truncated, redosWarning });
}

function toMatch(exec: RegExpExecArray): RegexMatch {
  const captures: RegexCapture[] = exec.slice(1).map((value, i) => ({
    index: i + 1,
    value,
  }));
  return {
    match: exec[0],
    index: exec.index,
    captures,
    namedGroups: exec.groups ? { ...exec.groups } : {},
  };
}
