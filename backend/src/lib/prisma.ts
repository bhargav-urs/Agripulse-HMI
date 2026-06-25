import { PrismaClient } from '@prisma/client';

/**
 * Single shared PrismaClient instance. In dev with hot-reload (tsx watch) we
 * stash it on globalThis so we don't exhaust the connection pool on reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
