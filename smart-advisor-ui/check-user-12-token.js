
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const token = await prisma.integrationToken.findFirst({
    where: { user_id: 12 }
  });
  console.log("Token for User 12:", token);
}

main().catch(console.error).finally(() => prisma.$disconnect());
