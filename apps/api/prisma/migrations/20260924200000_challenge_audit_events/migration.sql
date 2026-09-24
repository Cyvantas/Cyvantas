-- CYVANTAS Security Lab — challenge environment + submission audit events (Phase 11).
--
-- NOTE: authored to match prisma/schema.prisma. On this build host
-- (aarch64/Android/Termux) the Prisma schema-engine binary cannot run, so
-- `prisma migrate dev` was not used to emit this file. On a Prisma-supported
-- host you may regenerate with `prisma migrate dev`. The DDL below applies
-- cleanly on top of the Phase 10 (sandbox audit events) migration.
--
-- This migration ONLY extends the AuditEvent enum with the challenge-
-- environment and flag-submission lifecycle events. It creates NO runtime,
-- container, process, table, or column — challenge environments reuse the
-- existing `environments` table (type = CHALLENGE). `ALTER TYPE ... ADD VALUE`
-- is idempotent-guarded with IF NOT EXISTS so re-applying is safe.

ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_ENVIRONMENT_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_ENVIRONMENT_READY';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_ENVIRONMENT_FAILED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_ENVIRONMENT_RESET';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_ENVIRONMENT_DESTROYED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_SUBMISSION_ACCEPTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'CHALLENGE_SUBMISSION_REJECTED';
