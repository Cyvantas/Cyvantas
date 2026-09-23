import { useMemo, useState } from "react";
import { identifyHash } from "../../lib/tools/hash";
import type { HashIdentification } from "../../lib/tools/hash";
import { ToolTextarea } from "./ToolTextarea";
import { ToolEmpty } from "./ToolStates";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

function Guesses({ result }: { result: HashIdentification }) {
  if (result.guesses.length === 0) {
    return (
      <ToolEmpty>
        No known format matches this structure. It may be salted, truncated, encoded differently,
        or simply not a hash.
      </ToolEmpty>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-technical text-dim">Possible formats</span>
        <Badge tone="neutral">{result.normalized.length} chars</Badge>
      </div>
      <ul className="flex flex-col gap-2">
        {result.guesses.map((guess) => (
          <li
            key={guess.name}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-surface px-4 py-3"
          >
            <span className="font-mono text-sm text-foreground">{guess.name}</span>
            {guess.note ? <span className="text-caption">{guess.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HashPanel() {
  const [input, setInput] = useState("");
  const result = useMemo<HashIdentification | null>(
    () => (input.trim().length === 0 ? null : identifyHash(input)),
    [input],
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-accent-line bg-accent-soft px-4 py-3 text-sm text-muted"
      >
        Identification is based on <strong className="text-foreground">structure only</strong>{" "}
        (length and character set), so results are always{" "}
        <strong className="text-foreground">possible formats</strong>, not certainties. This tool
        does not crack hashes or look them up.
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
        label="Hash"
        placeholder="5f4dcc3b5aa765d61d8327deb882cf99"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={3}
      />

      {result === null ? (
        <ToolEmpty>Paste a hash to see its possible formats.</ToolEmpty>
      ) : (
        <Guesses result={result} />
      )}
    </div>
  );
}
