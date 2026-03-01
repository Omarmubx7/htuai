const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceSyncUser13() {
  try {
    const userId = 13;
    const courseId = 78;
    
    console.log("Setting dummy dates for User 13 Course 78...");
    await prisma.course.update({
      where: { id: courseId },
      data: {
        midterm_date: new Date("2026-03-15T10:00:00Z"),
        final_date: new Date("2026-03-25T10:00:00Z")
      }
    });

    console.log("Dates set. Now you should trigger sync from the UI or wait for auto-sync.");
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const token = await prisma.integrationToken.findFirst({ where: { user_id: userId } });
    
    if (!token) {
      console.log("User 13 has no token!");
      return;
    }
    
    console.log("User 13 has token. Sync should work if they trigger it.");

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

forceSyncUser13();