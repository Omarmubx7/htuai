
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.integrationToken.findMany({ include: { user: true } });
  console.log("Tokens in DB:");
  tokens.forEach(t => {
    console.log(`- ID: ${t.id}, Provider: ${t.provider}, UserID: ${t.user_id}, Identity: ${t.user.student_id || t.user.email}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
