/**
 * Prisma client lifecycle.
 *
 * One client instance per process (cached across hot-reloads in development to
 * avoid exhausting connections). No per-request client creation. Logging is
 * restricted to warnings and errors so query text and parameters — which could
 * contain sensitive values — are never written to logs.
 */
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  __cyvantasPrisma?: PrismaClient
}

export function getPrismaClient(databaseUrl: string): PrismaClient {
  const existing = globalForPrisma.__cyvantasPrisma
  if (existing) return existing

  const client = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: ["warn", "error"],
  })

  globalForPrisma.__cyvantasPrisma = client
  return client
}

export async function disconnectPrisma(): Promise<void> {
  const existing = globalForPrisma.__cyvantasPrisma
  if (existing) {
    await existing.$disconnect()
    globalForPrisma.__cyvantasPrisma = undefined
  }
}
