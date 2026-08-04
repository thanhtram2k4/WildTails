import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Creates a PrismaClient instance using the PostgreSQL driver adapter.
 * Framework-independent — no NestJS imports.
 *
 * @param databaseUrl - PostgreSQL connection string. Falls back to DATABASE_URL env var.
 * @returns A configured PrismaClient instance.
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const connectionString = databaseUrl ?? process.env['DATABASE_URL'] ?? '';
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
