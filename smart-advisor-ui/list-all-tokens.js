
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.integrationToken.findMany({ include: { user: true } });
  console.log("Tokens in DB:", tokens.map(t => ({ id: t.id, user_id: t.user_id, email: t.user.email, student_id: t.user.student_id })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
