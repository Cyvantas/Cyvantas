-- CYVANTAS Security Lab — environments schema (Phase 9).
--
-- NOTE: authored to match prisma/schema.prisma. On this build host
-- (aarch64/Android/Termux) the Prisma schema-engine binary cannot run, so
-- `prisma migrate dev` was not used to emit this file. On a Prisma-supported
-- host you may regenerate with `prisma migrate dev`. The DDL below applies
-- cleanly on top of the initial (Phase 8) migration.
--
-- This migration adds the Environment lifecycle model and its enums, and
-- extends the AuditEvent enum with environment lifecycle events. It creates NO
-- runtime, container, or process — the Environment model is control-plane only.

-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('CHALLENGE', 'MISSION');

-- CreateEnum
CREATE TYPE "EnvironmentStatus" AS ENUM ('REQUESTED', 'PROVISIONING', 'READY', 'ACTIVE', 'TIMEOUT', 'RESETTING', 'DESTROYING', 'DESTROYED', 'FAILED');

-- CreateEnum
CREATE TYPE "EnvironmentRuntimeStatus" AS ENUM ('NOT_PROVISIONED', 'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'FAILED');

-- AlterEnum: extend AuditEvent with environment lifecycle events.
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_CREATED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_START_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_READY';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_ACTIVATED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_RESET_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_STOP_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_DESTROY_REQUESTED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_DESTROYED';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_TIMEOUT';
ALTER TYPE "AuditEvent" ADD VALUE 'ENVIRONMENT_FAILED';

-- CreateTable
CREATE TABLE "environments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "EnvironmentType" NOT NULL,
    "challengeSlug" TEXT,
    "missionSlug" TEXT,
    "status" "EnvironmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "runtimeStatus" "EnvironmentRuntimeStatus" NOT NULL DEFAULT 'NOT_PROVISIONED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provisioningStartedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "timeoutAt" TIMESTAMP(3),
    "destroyedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "environments_userId_idx" ON "environments"("userId");

-- CreateIndex
CREATE INDEX "environments_status_idx" ON "environments"("status");

-- CreateIndex
CREATE INDEX "environments_expiresAt_idx" ON "environments"("expiresAt");

-- CreateIndex
CREATE INDEX "environments_userId_status_idx" ON "environments"("userId", "status");

-- CreateIndex
CREATE INDEX "environments_challengeSlug_idx" ON "environments"("challengeSlug");

-- CreateIndex
CREATE INDEX "environments_missionSlug_idx" ON "environments"("missionSlug");

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
