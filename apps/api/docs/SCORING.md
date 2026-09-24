# Scoring & Progress (Phase 12)

Phase 12 makes the server the **sole authority** for score, points, completion,
solved-state, and awarded points. It builds on the Phase 11 challenge submission
flow: a correct flag no longer writes a bare completion record — it now counts
attempts, records completion, and awards points **exactly once** through an
append-only ledger, and exposes a safe read API.

```
POST /challenges/:slug/submit
  → verify flag (server, boolean only)
  → ownership + association (environmentService / loadForChallenge)
  → state + expiry checks
  → points = catalog.challengePoints(slug)         ← catalog, NEVER the body
  → scoring.recordSubmission(...)                  ← attempt++ ; once-only award
  → return { correct, alreadySolved, pointsAwarded, totalPoints }
```

## Trust model — the client is authoritative for nothing

- **Points come from the catalog, never the request.** `challengeService.submit`
  resolves the award via `catalogService.challengePoints(slug)`
  (`reflected-xss = 100`). The submit body is zod-validated to
  `{ environmentId, answer }` only, so any client-supplied `points` field is
  dropped at the boundary.
- **The actor is the session, never the body.** `userId` is taken from the
  authenticated session; a spoofed body `userId` is ignored.
- **Correctness and solved-state are server-decided.** The response carries only
  `correct`, `alreadySolved`, `pointsAwarded`, `totalPoints` — never the flag, a
  reason, or a partial-match signal.
- **Score is immutable once awarded.** The `ScoreEvent` ledger is append-only and
  never mutated after creation.

## Once-only guarantee

The append-only **`ScoreEvent`** table is the source of truth for awarded points.
Its unique key `(userId, challengeSlug, reason)` makes a completion score-able
**exactly once**: a duplicate or racing correct submission's second insert
violates the constraint instead of double-scoring.

- **Prisma:** `recordSubmission` counts the attempt (atomic `increment`), then on
  a first solve inserts the `ScoreEvent`; a `P2002` unique violation is caught and
  treated as `alreadySolved` (points already awarded by the winning request). The
  `challenge_progress` row is a derived, best-effort projection.
- **In-memory:** the same semantics via a dedupe check on
  `(userId, challengeSlug, reason)` before pushing to the `scoreEvents` array.

The default `reason` is `CHALLENGE_COMPLETION` (`CHALLENGE_COMPLETION_REASON`).

## Persistence

`ChallengeProgress` is extended with attempt/scoring bookkeeping and a new
append-only `ScoreEvent` ledger is added:

| Model | Fields (Phase 12) |
| ----- | ----------------- |
| `ChallengeProgress` | `attempts`, `pointsAwarded`, `firstSolvedAt`, `lastAttemptAt` (plus existing `status`, `completedAt`, unique `[userId, challengeSlug]`). |
| `ScoreEvent` | `id`, `userId`, `challengeSlug`, `points`, `reason`, `createdAt`; unique `[userId, challengeSlug, reason]`; index `[userId]`; FK → `users` `onDelete: Cascade`. |

`totalPoints` is always the **sum of the user's `ScoreEvent` points** (Prisma
`aggregate`; in-memory reduce) — never a mutable counter that could drift.

The migration `prisma/migrations/20260924210000_scoring/migration.sql` is
hand-authored to match `schema.prisma` (the Prisma schema-engine cannot run on
this Termux/aarch64 host) and is idempotent (`ADD COLUMN IF NOT EXISTS` /
`CREATE TABLE IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS`). It creates **no**
runtime, container, process, or vulnerable target. Regenerate with
`prisma migrate dev` on a Prisma-supported host.

## HTTP surface

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/api/v1/challenges/:slug/submit` | yes | Returns the scoring outcome (below). |
| GET | `/api/v1/progress` | yes | The caller's own server-authoritative progress. |

### Submission outcome

```jsonc
{
  "correct": true,        // server-authoritative verifier boolean
  "alreadySolved": false, // true for every correct submission after the first
  "pointsAwarded": 100,   // non-zero ONLY on the first correct solve (catalog)
  "totalPoints": 100      // the user's running total (sum of the ScoreEvent ledger)
}
```

### Progress summary (`GET /progress`)

```jsonc
{
  "totalPoints": 100,
  "solvedCount": 1,
  "challenges": [
    {
      "challengeSlug": "reflected-xss",
      "status": "completed",
      "attempts": 1,
      "pointsAwarded": 100,
      "firstSolvedAt": "2026-09-24T00:00:00.000Z",
      "completedAt": "2026-09-24T00:00:00.000Z",
      "lastAttemptAt": "2026-09-24T00:00:00.000Z"
    }
  ]
}
```

The progress DTO (`UserProgressView`) omits `userId` and any internal id; being
a read-only GET it needs no CSRF/rate-limit gate (auth still required).

## Audit events

`CHALLENGE_SUBMISSION_ACCEPTED` / `CHALLENGE_SUBMISSION_REJECTED` on every
submission, plus `CHALLENGE_SCORE_AWARDED` **only on the first solve** (never on a
duplicate). Flags, tokens, and passwords are never logged.

## Frontend contract (apps/lab)

`apps/lab/src/providers/ChallengeProgressProvider.ts` is an honest no-op stub
(`supportsPersistence = false`) mirroring `MissionProgressProvider`. It fabricates
no saved scores; a future account-backed provider will read `GET /api/v1/progress`.
Consumers must branch on `supportsPersistence` before showing any earned-score UI.

## Not in this phase

Leaderboards, badges, streaks, per-mission scoring aggregation, and time/hint
penalties. Those are Phase 13+.
