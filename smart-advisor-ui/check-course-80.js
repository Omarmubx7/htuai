const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findUnique({
    where: { id: 80 },
    include: { semester: { include: { user: true } } }
  });
  console.log(JSON.stringify(course, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());