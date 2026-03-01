const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const semesters = await prisma.semester.findMany({
    where: { user_id: 13 },
    include: { courses: true }
  });
  console.log(JSON.stringify(semesters, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());