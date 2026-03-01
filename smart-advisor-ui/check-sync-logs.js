const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.adminLog.findMany({
    where: { 
        OR: [
            { message: { contains: 'Schedule' } },
            { message: { contains: 'Final' } },
            { message: { contains: 'Midterm' } }
        ]
    },
    orderBy: { created_at: 'desc' },
    take: 50
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());