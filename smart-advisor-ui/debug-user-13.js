const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser13() {
  try {
    const userId = 13;
    const courses = await prisma.course.findMany({
      where: { semester: { user_id: userId } }
    });
    console.log("Courses for User 13:");
    console.log(courses.map(c => ({ id: c.id, name: c.name, midterm: c.midterm_date, final: c.final_date })));

    const events = await prisma.calendarEvent.findMany({
      where: { user_id: userId }
    });
    console.log("\nCalendar Events for User 13:");
    console.log(events);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser13();