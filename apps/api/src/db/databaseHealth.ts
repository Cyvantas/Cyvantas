/**
 * Database readiness probe.
 *
 * A minimal, side-effect-free connectivity check for the readiness endpoint. It
 * performs the smallest safe round-trip (`SELECT 1`) against the EXISTING Prisma
 * client — it never mutates the schema, never migrates, and never recovers. The
 * check is bounded by a timeout and is fail-closed: any error or timeout
 * resolves to `false` and no raw driver/connection detail ever escapes (the
 * caller receives only a boolean).
 *
 * Migrations remain an explicit deployment operation (`prisma migrate deploy`),
 * NEVER triggered from application startup or an HTTP request. See
 * docs/PRODUCTION-INFRASTRUCTURE.md.
 */
import type { PrismaClient } from "@prisma/client"

/** A backend-agnostic database liveness probe. */
export interface DatabaseHealthCheck {
  /** Resolves true if the database answered a trivial query within the bound. */
  ping(timeoutMs?: number): Promise<boolean>
}

const DEFAULT_TIMEOUT_MS = 2000

/**
 * Run a bounded `SELECT 1` against the given Prisma client. Never throws; a
 * rejection or timeout resolves to `false`. The timer is always cleared so a
 * fast success does not leave a dangling handle.
 */
export async function checkPrismaHealth(
  prisma: PrismaClient,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  const query = prisma
    .$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false)
  try {
    return await Promise.race([query, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
