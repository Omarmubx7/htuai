
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const tokens = await prisma.integrationToken.count();
  const progress = await prisma.studentProgress.count();
  const profiles = await prisma.studentProfile.count();
  
  console.log(`Users: ${users}`);
  console.log(`Tokens: ${tokens}`);
  console.log(`Progress: ${progress}`);
  console.log(`Profiles: ${profiles}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
