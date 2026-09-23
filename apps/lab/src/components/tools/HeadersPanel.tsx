import { useMemo, useState } from "react";
import { analyzeHeaders } from "../../lib/tools/headers";
import type { HeaderFinding, HeaderStatus } from "../../lib/tools/headers";
import { ToolTextarea } from "./ToolTextarea";
import { ToolEmpty } from "./ToolStates";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const STATUS_META: Record<HeaderStatus, { tone: "green" | "critical" | "medium"; label: string }> = {
  present: { tone: "green", label: "Present" },
  missing: { tone: "critical", label: "Missing" },
  review: { tone: "medium", label: "Review" },
};

const STATUS_ORDER: HeaderStatus[] = ["missing", "review", "present"];

function FindingCard({ finding }: { finding: HeaderFinding }) {
  const meta = STATUS_META[finding.status];
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-foreground">{finding.name}</span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      {finding.value ? (
        <p className="font-mono text-xs break-all text-muted">{finding.value}</p>
      ) : null}
      <p className="text-body text-sm text-muted">{finding.purpose}</p>
      <p className="text-sm text-foreground">{finding.detail}</p>
    </li>
  );
}

export function HeadersPanel() {
  const [input, setInput] = useState("");

  const analysis = useMemo(
    () => (input.trim().length === 0 ? null : analyzeHeaders(input)),
    [input],
  );

  const sorted = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.findings].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );
  }, [analysis]);

  const counts = useMemo(() => {
    const tally: Record<HeaderStatus, number> = { present: 0, missing: 0, review: 0 };
    for (const finding of sorted) tally[finding.status] += 1;
    return tally;
  }, [sorted]);

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm text-muted"
      >
        Paste raw HTTP <strong className="text-foreground">response headers</strong> to review them.
        This tool <strong className="text-foreground">does not fetch any URL</strong> and makes no
        network request — parsing happens entirely in your browser.
      </div>

      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={input.length === 0}>
          Clear
        </Button>
      </div>

      <ToolTextarea
        label="Response headers"
        hint="One header per line, e.g. content-security-policy: default-src 'self'"
        placeholder={"content-type: text/html\nstrict-transport-security: max-age=63072000\nx-content-type-options: nosniff"}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={8}
      />

      {analysis === null ? (
        <ToolEmpty>Paste response headers to analyze their security posture.</ToolEmpty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{analysis.parsedCount} headers parsed</Badge>
            <Badge tone="critical">{counts.missing} missing</Badge>
            <Badge tone="medium">{counts.review} review</Badge>
            <Badge tone="green">{counts.present} present</Badge>
          </div>
          <ul className="flex flex-col gap-3">
            {sorted.map((finding) => (
              <FindingCard key={finding.name} finding={finding} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
