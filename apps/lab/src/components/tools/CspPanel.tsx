import { useMemo, useState } from "react";
import {
  CSP_DIRECTIVES,
  COMMON_SOURCES,
  EMPTY_CSP_VALUES,
  buildCspPolicy,
  explainCsp,
} from "../../lib/tools/csp";
import type { CspDirective, CspValues } from "../../lib/tools/csp";
import { OutputBlock, ToolEmpty } from "./ToolStates";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

const chipBase =
  "rounded-full border px-3 py-1 text-xs font-mono transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const chipActive = "border-accent-line bg-accent-soft text-accent";
const chipIdle = "border-border text-muted hover:border-accent-line hover:text-foreground";

function toggle(list: string[], token: string): string[] {
  return list.includes(token) ? list.filter((t) => t !== token) : [...list, token];
}

function DirectiveRow({
  directive,
  sources,
  onToggle,
}: {
  directive: CspDirective;
  sources: string[];
  onToggle: (token: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle py-4 first:border-t-0 first:pt-0">
      <span className="font-mono text-sm text-foreground">{directive}</span>
      <div className="flex flex-wrap gap-2">
        {COMMON_SOURCES.map((source) => {
          const active = sources.includes(source.token);
          return (
            <button
              key={source.token}
              type="button"
              aria-pressed={active}
              aria-label={`${directive} ${source.label}: ${source.note}`}
              title={source.note}
              onClick={() => onToggle(source.token)}
              className={cn(chipBase, active ? chipActive : chipIdle)}
            >
              {source.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CspPanel() {
  const [values, setValues] = useState<CspValues>(EMPTY_CSP_VALUES);
  const [host, setHost] = useState("");

  const toggleSource = (directive: CspDirective, token: string) =>
    setValues((prev) => ({ ...prev, [directive]: toggle(prev[directive], token) }));

  const addHost = () => {
    const trimmed = host.trim();
    if (trimmed.length === 0) return;
    setValues((prev) => ({
      ...prev,
      "default-src": prev["default-src"].includes(trimmed)
        ? prev["default-src"]
        : [...prev["default-src"], trimmed],
    }));
    setHost("");
  };

  const removeHost = (token: string) =>
    setValues((prev) => ({
      ...prev,
      "default-src": prev["default-src"].filter((t) => t !== token),
    }));

  const reset = () => {
    setValues(EMPTY_CSP_VALUES);
    setHost("");
  };

  const policy = useMemo(() => buildCspPolicy(values), [values]);
  const explanation = useMemo(() => explainCsp(values), [values]);
  const customHosts = values["default-src"].filter(
    (t) => !COMMON_SOURCES.some((s) => s.token === t),
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm text-muted"
      >
        Toggle sources per directive to compose a{" "}
        <strong className="text-foreground">Content-Security-Policy</strong>. Everything is built
        locally — nothing is sent anywhere.
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="csp-host" className="text-technical text-dim">
          Add a host to default-src
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="csp-host"
            type="text"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addHost();
              }
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="https://cdn.example.com"
            className={cn(
              "min-w-[16rem] flex-1 rounded-md border border-border bg-surface px-3 py-2",
              "font-mono text-sm text-foreground placeholder:text-dim transition-colors",
              "hover:border-accent-line focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          />
          <Button variant="ghost" size="sm" onClick={addHost} disabled={host.trim().length === 0}>
            Add host
          </Button>
        </div>
        {customHosts.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {customHosts.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => removeHost(token)}
                aria-label={`Remove ${token} from default-src`}
                className={cn(chipBase, chipActive)}
              >
                {token} ✕
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-surface px-4 py-2">
        {CSP_DIRECTIVES.map((meta) => (
          <DirectiveRow
            key={meta.name}
            directive={meta.name}
            sources={values[meta.name]}
            onToggle={(token) => toggleSource(meta.name, token)}
          />
        ))}
      </div>

      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={reset} disabled={policy.length === 0}>
          Reset
        </Button>
      </div>

      {policy.length === 0 ? (
        <ToolEmpty>Select at least one source to generate a policy.</ToolEmpty>
      ) : (
        <>
          <OutputBlock label="Content-Security-Policy" value={policy} copyLabel="CSP policy" />
          <div className="flex flex-col gap-3">
            <span className="text-technical text-dim">What this policy does</span>
            <ul className="flex flex-col gap-3">
              {explanation.map((entry) => (
                <li
                  key={entry.directive}
                  className="flex flex-col gap-1.5 rounded-md border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-foreground">{entry.directive}</span>
                    {entry.sources.map((source) => (
                      <Badge key={source} tone="neutral">
                        {source}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-body text-sm text-muted">{entry.summary}</p>
                  {entry.warnings.map((warning) => (
                    <p key={warning} className="text-sm text-warning">
                      {warning}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
