import { defineConfig } from "vitest/config"

/**
 * LIVE INTEGRATION test config — used by `npm run test:integration` (CI only).
 *
 * Runs ONLY tests/integration/**, which exercise a real PostgreSQL + Redis. The
 * suites self-skip (describe.skipIf) when DATABASE_URL / REDIS_URL are absent,
 * so this command is a no-op on a host without live infra rather than a failure.
 *
 * Files run sequentially (fileParallelism: false) so the two "logical instances"
 * and the shared Redis/PostgreSQL state are not raced across worker processes;
 * timeouts are widened because these tests do real network round-trips and poll
 * a real broker for TTL expiry.
 */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
