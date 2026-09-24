-- CYVANTAS Security Lab — scoring: score ledger + progress extension (Phase 12).
--
-- NOTE: authored to match prisma/schema.prisma. On this build host
-- (aarch64/Android/Termux) the Prisma schema-engine binary cannot run, so
-- `prisma migrate dev` was not used to emit this file. On a Prisma-supported
-- host you may regenerate with `prisma migrate dev`. The DDL below applies
-- cleanly on top of the Phase 11 (challenge audit events) migration.
--
-- Scope: make scoring server-authoritative and idempotent.
--   1. Extend `challenge_progress` with attempt/scoring bookkeeping columns.
--   2. Add the append-only `score_events` ledger — the source of truth for
--      awarded points. The UNIQUE (userId, challengeSlug, reason) key makes a
--      completion score-able EXACTLY ONCE; a duplicate/racing submission's
--      second insert violates the constraint instead of double-scoring.
--   3. Extend the AuditEvent enum with CHALLENGE_SCORE_AWARDED.
-- It creates NO runtime, container, process, or vulnerable target. `ADD COLUMN
-- IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS`
-- keep re-application safe.

ALTER TABLE "challenge_progress" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "challenge_progress" ADD COLUMN IF NOT EXISTS "pointsAwarded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "challenge_progress" ADD COLUMN IF NOT EXISTS "firstSolvedAt" TIMESTAMP(3);
ALTER TABLE "challenge_progress" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "score_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "score_events_userId_challengeSlug_reason_key"
    ON "score_events" ("userId", "challengeSlug", "reason");

CREATE INDEX IF NOT EXISTS "score_events_userId_idx"
    ON "score_events" ("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'score_events_userId_fkey'
    ) THEN
        ALTER TABLE "score_events"
            ADD CONSTRAINT "score_events_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_SCORE_AWARDED';
