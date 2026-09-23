import { useMemo, useState } from "react";
import { runRegex, SUPPORTED_FLAGS } from "../../lib/tools/regex";
import type { RegexMatch, RegexRunResult } from "../../lib/tools/regex";
import type { ToolResult } from "../../lib/tools/result";
import { ToolTextarea } from "./ToolTextarea";
import { ToolEmpty, ToolError } from "./ToolStates";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

const flagChip =
  "rounded-full border px-3 py-1 text-xs font-mono transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const flagActive = "border-accent-line bg-accent-soft text-accent";
const flagIdle = "border-border text-muted hover:border-accent-line hover:text-foreground";

const fieldClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-sm " +
  "text-foreground placeholder:text-dim transition-colors hover:border-accent-line " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function MatchCard({ match, ordinal }: { match: RegexMatch; ordinal: number }) {
  const named = Object.entries(match.namedGroups);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cyan">match {ordinal}</Badge>
        <Badge tone="neutral">index {match.index}</Badge>
      </div>
      <pre className="overflow-auto rounded-sm border border-border-subtle bg-surface-elevated px-2.5 py-1.5 font-mono text-sm text-foreground whitespace-pre-wrap break-words">
        {match.match === "" ? "(empty match)" : match.match}
      </pre>
      {match.captures.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-technical text-dim">Capture groups</span>
          <ul className="flex flex-col gap-1">
            {match.captures.map((capture) => (
              <li key={capture.index} className="flex items-baseline gap-2 text-sm">
                <span className="font-mono text-dim">#{capture.index}</span>
                <span className="font-mono text-foreground break-all">
                  {capture.value === undefined ? "(unmatched)" : capture.value || "(empty)"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {named.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-technical text-dim">Named groups</span>
          <ul className="flex flex-col gap-1">
            {named.map(([name, value]) => (
              <li key={name} className="flex items-baseline gap-2 text-sm">
                <span className="font-mono text-dim">{name}</span>
                <span className="font-mono text-foreground break-all">
                  {value === undefined ? "(unmatched)" : value || "(empty)"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

export function RegexPanel() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [input, setInput] = useState("");

  const toggleFlag = (flag: string) =>
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));

  const result = useMemo<ToolResult<RegexRunResult> | null>(
    () => (pattern.length === 0 ? null : runRegex(pattern, flags.join(""), input)),
    [pattern, flags, input],
  );

  const clear = () => {
    setPattern("");
    setInput("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm text-muted"
      >
        Test a regular expression against sample text. Matching runs{" "}
        <strong className="text-foreground">locally in your browser</strong> — no input is sent
        anywhere.
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="regex-pattern" className="text-technical text-dim">
          Pattern
        </label>
        <input
          id="regex-pattern"
          type="text"
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="\\b\\w+@\\w+\\.\\w+\\b"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-technical text-dim">Flags</span>
        <div role="group" aria-label="Regex flags" className="flex flex-wrap gap-2">
          {SUPPORTED_FLAGS.map((entry) => {
            const active = flags.includes(entry.flag);
            return (
              <button
                key={entry.flag}
                type="button"
                aria-pressed={active}
                aria-label={`${entry.flag} — ${entry.label}: ${entry.note}`}
                title={entry.note}
                onClick={() => toggleFlag(entry.flag)}
                className={cn(flagChip, active ? flagActive : flagIdle)}
              >
                {entry.flag} · {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      <ToolTextarea
        label="Test input"
        placeholder="Text to match against…"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={6}
      />

      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={pattern.length === 0 && input.length === 0}
        >
          Clear
        </Button>
      </div>

      {result === null ? (
        <ToolEmpty>Enter a pattern to start matching.</ToolEmpty>
      ) : !result.ok ? (
        <ToolError>{result.error}</ToolError>
      ) : (
        <div className="flex flex-col gap-4">
          {result.value.redosWarning ? (
            <p
              role="note"
              className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
            >
              {result.value.redosWarning}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={result.value.matches.length > 0 ? "green" : "neutral"}>
              {result.value.matches.length} match{result.value.matches.length === 1 ? "" : "es"}
            </Badge>
            {result.value.truncated ? <Badge tone="medium">truncated</Badge> : null}
          </div>
          {result.value.matches.length === 0 ? (
            <ToolEmpty>No matches for this pattern.</ToolEmpty>
          ) : (
            <ul className="flex flex-col gap-3">
              {result.value.matches.map((match, i) => (
                <MatchCard key={`${match.index}-${i}`} match={match} ordinal={i + 1} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
