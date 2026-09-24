/**
 * Session housekeeping. Deletes sessions whose expiry has passed. Exposed as a
 * plain function (not a scheduler) — a caller/cron in a later phase can invoke
 * it periodically. Expired/revoked sessions are already rejected at auth time;
 * this reclaims storage.
 */
import type { Repositories } from "../repositories/types.ts"

export async function cleanupExpiredSessions(
  repositories: Repositories,
  before: Date = new Date(),
): Promise<number> {
  return repositories.sessions.deleteExpired(before)
}
