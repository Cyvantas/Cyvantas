import { defineConfig, configDefaults } from "vitest/config"

/**
 * Default (UNIT) test config — used by `npm test`.
 *
 * Excludes tests/integration/** so the fast, dependency-free unit suite runs
 * everywhere (including Termux/aarch64, where the Prisma engine and a live
 * Redis/PostgreSQL are unavailable). The live integration suites have their own
 * config (vitest.integration.config.ts) and run via `npm run test:integration`,
 * which CI invokes after provisioning PostgreSQL + Redis.
 */
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/integration/**"],
  },
})
