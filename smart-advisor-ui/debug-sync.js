const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    console.log("--- Recent Users ---");
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    });
    console.log(users.map(u => ({ id: u.id, student_id: u.student_id, email: u.email })));

    console.log("\n--- Integration Tokens ---");
    const tokens = await prisma.integrationToken.findMany();
    console.log(tokens.map(t => ({ user_id: t.user_id, provider: t.provider, has_refresh: !!t.refresh_token })));

    console.log("\n--- Calendar Events ---");
    const events = await prisma.calendarEvent.findMany({
      orderBy: { created_at: 'desc' },
      take: 10
    });
    console.log(events.map(e => ({ user_id: e.user_id, course_id: e.course_id, type: e.type, google_id: e.google_event_id })));

    console.log("\n--- Recent Sync Logs ---");
    const logs = await prisma.adminLog.findMany({
      where: { event_kind: 'calendar_sync' },
      orderBy: { created_at: 'desc' },
      take: 10
    });
    console.log(logs.map(l => ({ msg: l.message, created: l.created_at })));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debug();