
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sem = await prisma.semester.findUnique({
    where: { id: 27 }
  });
  console.log("Semester 27:", sem);
}

main().catch(console.error).finally(() => prisma.$disconnect());
