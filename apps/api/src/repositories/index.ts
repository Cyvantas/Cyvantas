/**
 * Repository factory. Selects the persistence backend from configuration:
 *   - DATABASE_URL present → Prisma/PostgreSQL (production path)
 *   - otherwise            → in-memory (local dev without a DB, and tests)
 *
 * The Prisma module is imported dynamically so that the in-memory path never
 * loads the Prisma client (keeping dev startup light and avoiding engine load
 * on platforms where the Prisma query engine cannot run).
 */
import type { AppConfig } from "../config/env.ts"
import type { Repositories } from "./types.ts"
import { createInMemoryRepositories } from "./memory.ts"

export async function createRepositories(
  config: AppConfig,
): Promise<Repositories> {
  if (!config.databaseUrl) {
    return createInMemoryRepositories()
  }
  const [{ getPrismaClient }, { createPrismaRepositories }] = await Promise.all([
    import("../db/prisma.ts"),
    import("./prisma.ts"),
  ])
  return createPrismaRepositories(getPrismaClient(config.databaseUrl))
}

export type { Repositories } from "./types.ts"
