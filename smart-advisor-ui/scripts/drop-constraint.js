const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Dropping old constraints manually...");
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "integration_tokens" DROP CONSTRAINT IF EXISTS "integration_tokens_student_id_provider_key" CASCADE;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "integration_tokens" DROP INDEX IF EXISTS "integration_tokens_student_id_provider_key" CASCADE;`);
        console.log("✅ Dropped old constraint.");
    } catch(e) { console.error("Error dropping constraint:", e.message); }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
