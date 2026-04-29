
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    const profileCount = await prisma.studentProfile.count();
    const progressCount = await prisma.studentProgress.count();
    const integrationCount = await prisma.integrationToken.count();
    
    console.log({
      userCount,
      profileCount,
      progressCount,
      integrationCount
    });

    const sampleUsers = await prisma.user.findMany({ take: 5 });
    console.log('Sample Users:', sampleUsers);

    const missingUserIdProfiles = await prisma.studentProfile.findMany({
      where: { user_id: { not: { gt: 0 } } }
    });
    console.log('Profiles with missing user_id:', missingUserIdProfiles.length);

  } catch (e) {
    console.error('DB Check Failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
