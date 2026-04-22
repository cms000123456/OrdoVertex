import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaClient instance.
 * Prisma recommends a single instance per application to avoid connection pool exhaustion.
 */
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
