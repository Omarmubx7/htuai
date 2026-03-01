const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function triggerSyncForUser13() {
  try {
    const userId = 13;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // We need to simulate the getServerSession call basically
    // Instead, let's just run the sync logic directly here for User 13
    
    const studentId = user.student_id || user.email;
    const token = await prisma.integrationToken.findFirst({
        where: { user_id: userId, provider: "google_calendar" }
    });

    if (!token) {
        console.log("No token for user 13");
        return;
    }

    console.log(`Simulating sync for User 13 (${user.email})...`);
    
    // We need to import getIntegrationToken refresh logic?
    // Let's just use the current access token.
    
    const activeSemesters = await prisma.semester.findMany({
        where: { user_id: userId },
        include: { courses: true }
    });

    console.log(`Found ${activeSemesters.length} semesters.`);
    
    for (const sem of activeSemesters) {
        for (const course of sem.courses) {
            console.log(`Course: ${course.code} - ${course.name}`);
            console.log(`  Midterm: ${course.midterm_date}`);
            console.log(`  Final: ${course.final_date}`);
            
            if (course.midterm_date || course.final_date) {
                console.log("  Syncing exams...");
                // In a real test we'd call the Google API here, but I just want to see if the loop finds them.
            }
        }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

triggerSyncForUser13();