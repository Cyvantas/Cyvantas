import { useMemo, useState } from "react";
import { decodeJwt } from "../../lib/tools/jwt";
import type { DecodedJwt, JwtTimestamp } from "../../lib/tools/jwt";
import type { ToolResult } from "../../lib/tools/result";
import { ToolTextarea } from "./ToolTextarea";
import { OutputBlock, ToolEmpty, ToolError } from "./ToolStates";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const STATE_META: Record<
  NonNullable<JwtTimestamp["state"]>,
  { tone: "critical" | "green" | "medium"; label: string }
> = {
  expired: { tone: "critical", label: "Expired" },
  "not-yet-valid": { tone: "medium", label: "Not yet valid" },
  active: { tone: "green", label: "Valid" },
};

function TimestampRow({ ts }: { ts: JwtTimestamp }) {
  const human = new Date(ts.seconds * 1000).toUTCString();
  const meta = ts.state ? STATE_META[ts.state] : null;
  return (
    <li className="flex flex-col gap-1 border-t border-border-subtle py-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <span className="text-technical text-dim">
          {ts.claim} · {ts.label}
        </span>
        {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
      </div>
      <span className="font-mono text-sm text-foreground">{human}</span>
      <span className="text-caption">{ts.iso}</span>
    </li>
  );
}

function DecodedView({ jwt }: { jwt: DecodedJwt }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cyan">alg: {jwt.algorithm ?? "unknown"}</Badge>
        {jwt.type ? <Badge tone="neutral">typ: {jwt.type}</Badge> : null}
      </div>

      {jwt.timestamps.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-technical text-dim">Timestamps</span>
          <ul className="rounded-md border border-border bg-surface px-4 py-3">
            {jwt.timestamps.map((ts) => (
              <TimestampRow key={ts.claim} ts={ts} />
            ))}
          </ul>
        </div>
      ) : null}

      <OutputBlock label="Header" value={JSON.stringify(jwt.header, null, 2)} copyLabel="header" />
      <OutputBlock label="Payload" value={JSON.stringify(jwt.payload, null, 2)} copyLabel="payload" />

      <div className="flex flex-col gap-2">
        <span className="text-technical text-dim">Signature</span>
        <p className="font-mono text-sm break-all text-muted">{jwt.signature}</p>
        <p className="text-caption">
          The signature is shown as-is and is <strong>not verified</strong>. This tool inspects
          structure only.
        </p>
      </div>
    </div>
  );
}

export function JwtPanel() {
  const [input, setInput] = useState("");
  const result = useMemo<ToolResult<DecodedJwt> | null>(
    () => (input.trim().length === 0 ? null : decodeJwt(input)),
    [input],
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm text-muted"
      >
        This tool <strong className="text-foreground">decodes and inspects</strong> a JWT locally in
        your browser. It does <strong className="text-foreground">not verify the signature</strong>{" "}
        and never sends the token anywhere.
      </div>

      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInput("")}
          disabled={input.length === 0}
        >
          Clear
        </Button>
      </div>

      <ToolTextarea
        label="JWT"
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={5}
      />

      {result === null ? (
        <ToolEmpty>Paste a JWT to decode its header, payload, and claims.</ToolEmpty>
      ) : !result.ok ? (
        <ToolError>{result.error}</ToolError>
      ) : (
        <DecodedView jwt={result.value} />
      )}
    </div>
  );
}
