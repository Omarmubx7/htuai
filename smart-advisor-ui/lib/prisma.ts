import { PrismaClient } from '@prisma/client'
import { buildLocalPostgresUrl } from './postgres-url'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

/**
 * Resolve the database URL at runtime.
 * In production (Vercel), use the platform-provided POSTGRES_PRISMA_URL.
 * Locally, build the URL from individual POSTGRES_* env vars.
 */
function getDatabaseUrl(): string {
    // Vercel Postgres / Neon provides these directly
    if (process.env.POSTGRES_PRISMA_URL) return process.env.POSTGRES_PRISMA_URL;
    if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
    // Local development fallback
    return buildLocalPostgresUrl();
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: {
        db: {
            url: getDatabaseUrl(),
        },
    },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
