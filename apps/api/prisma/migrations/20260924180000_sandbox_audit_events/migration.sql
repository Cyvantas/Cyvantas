-- CYVANTAS Security Lab — sandbox orchestration audit events (Phase 10).
--
-- NOTE: authored to match prisma/schema.prisma. On this build host
-- (aarch64/Android/Termux) the Prisma schema-engine binary cannot run, so
-- `prisma migrate dev` was not used to emit this file. On a Prisma-supported
-- host you may regenerate with `prisma migrate dev`. The DDL below applies
-- cleanly on top of the Phase 9 (environments) migration.
--
-- This migration ONLY extends the AuditEvent enum with the sandbox
-- orchestration lifecycle events. It creates NO runtime, container, process,
-- table, or column — Phase 10 is orchestration/policy only and provisions no
-- real sandbox. `ALTER TYPE ... ADD VALUE` is idempotent-guarded with IF NOT
-- EXISTS so re-applying the migration is safe.

ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_PROVISION_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_PROVISION_REJECTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_PROVISION_STARTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_READY';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_START_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_STARTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_STOP_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_STOPPED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_RESET_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_RESET';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_DESTROY_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_DESTROYED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_RUNTIME_UNAVAILABLE';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_POLICY_REJECTED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'SANDBOX_TIMEOUT';
