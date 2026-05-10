import { PrismaClient } from '@prisma/client'
import { buildLocalPostgresUrl } from './postgres-url'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: {
        db: {
            url: buildLocalPostgresUrl(),
        },
    },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
