const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting DB Cleanup and Backfill...");

    // 1. Backfill admin_logs columns (must create them first since prisma hasn't pushed yet)
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "course_id" INT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "event_kind" VARCHAR(50);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "target_id" VARCHAR(100);`);
        
        await prisma.$executeRawUnsafe(`
            UPDATE "admin_logs" 
            SET "course_id" = CAST("details"->>'courseId' AS INT),
                "event_kind" = "details"->>'eventKind',
                "target_id" = "details"->>'targetId'
            WHERE "details" IS NOT NULL;
        `);
        console.log("✅ admin_logs backfilled successfully.");
    } catch(e) { console.error("Error backfilling admin_logs:", e.message); }

    // 2. Safely backfill user_ids by matching student_ids or names
    console.log("Backfilling missing user relations...");
    try {
        await prisma.$executeRawUnsafe(`UPDATE "course_notes" cn SET "user_id" = u.id FROM "users" u WHERE cn."user_id" IS NULL AND (cn."student_id" = u."student_id" OR cn."student_id" = u."name");`);
        await prisma.$executeRawUnsafe(`UPDATE "student_profile" sp SET "user_id" = u.id FROM "users" u WHERE sp."user_id" IS NULL AND (sp."student_id" = u."student_id" OR sp."student_id" = u."name");`);
        await prisma.$executeRawUnsafe(`UPDATE "student_progress" sp SET "user_id" = u.id FROM "users" u WHERE sp."user_id" IS NULL AND (sp."student_id" = u."student_id" OR sp."student_id" = u."name");`);
        await prisma.$executeRawUnsafe(`UPDATE "integration_tokens" it SET "user_id" = u.id FROM "users" u WHERE it."user_id" IS NULL AND (it."student_id" = u."student_id" OR it."student_id" = u."name");`);
        
        await prisma.$executeRawUnsafe(`
            UPDATE "course_notes" cn 
            SET "db_course_id" = CAST(cn."course_id" AS INT) 
            FROM "courses" c 
            WHERE cn."db_course_id" IS NULL 
              AND cn."course_id" IS NOT NULL 
              AND cn."course_id" ~ '^[0-9]+$' 
              AND CAST(cn."course_id" AS INT) = c.id;
        `);
        
        // Ensure unique catchall users exist for each completely unsolvable orphan student_id
        const orphanProfiles = await prisma.$queryRawUnsafe(`SELECT DISTINCT "student_id" FROM "student_profile" WHERE "user_id" IS NULL;`);
        const orphanProgress = await prisma.$queryRawUnsafe(`SELECT DISTINCT "student_id" FROM "student_progress" WHERE "user_id" IS NULL;`);
        const orphanTokens = await prisma.$queryRawUnsafe(`SELECT DISTINCT "student_id", "provider" FROM "integration_tokens" WHERE "user_id" IS NULL;`);
        const orphanNotes = await prisma.$queryRawUnsafe(`SELECT DISTINCT "student_id" FROM "course_notes" WHERE "user_id" IS NULL;`);

        const allOrphanIds = new Set();
        for (const o of orphanProfiles) if (o.student_id) allOrphanIds.add(o.student_id);
        for (const o of orphanProgress) if (o.student_id) allOrphanIds.add(o.student_id);
        for (const o of orphanTokens) if (o.student_id) allOrphanIds.add(o.student_id);
        for (const o of orphanNotes) if (o.student_id) allOrphanIds.add(o.student_id);

        let iter = 1;
        for (const o_id of allOrphanIds) {
            let dummy = await prisma.user.create({ data: { name: o_id || ('Legacy Data ' + iter), email: 'orphan' + iter + '@proxy.local', role: 'system' }});
            await prisma.$executeRawUnsafe(`UPDATE "course_notes" SET "user_id" = $1 WHERE "user_id" IS NULL AND "student_id" = $2;`, dummy.id, o_id);
            await prisma.$executeRawUnsafe(`UPDATE "student_profile" SET "user_id" = $1 WHERE "user_id" IS NULL AND "student_id" = $2;`, dummy.id, o_id);
            await prisma.$executeRawUnsafe(`UPDATE "student_progress" SET "user_id" = $1 WHERE "user_id" IS NULL AND "student_id" = $2;`, dummy.id, o_id);
            await prisma.$executeRawUnsafe(`UPDATE "integration_tokens" SET "user_id" = $1 WHERE "user_id" IS NULL AND "student_id" = $2;`, dummy.id, o_id);
            iter++;
        }

        // Remaining NULLs are literally lacking both user_id and student_id
        await prisma.$executeRawUnsafe(`DELETE FROM "course_notes" WHERE "user_id" IS NULL;`);
        await prisma.$executeRawUnsafe(`DELETE FROM "student_profile" WHERE "user_id" IS NULL;`);
        await prisma.$executeRawUnsafe(`DELETE FROM "student_progress" WHERE "user_id" IS NULL;`);
        await prisma.$executeRawUnsafe(`DELETE FROM "integration_tokens" WHERE "user_id" IS NULL;`);
        
        // Courses don't map to student IDs directly, if they lack a semester they truly are broken orphans since courses belong to semesters.
        await prisma.$executeRawUnsafe(`DELETE FROM "courses" WHERE "semester_id" IS NULL;`);
        await prisma.$executeRawUnsafe(`DELETE FROM "course_notes" WHERE "db_course_id" IS NULL;`);
        console.log("✅ Orphans resolved safely via catchall.");
    } catch(e) { console.error("Error backing up true orphans:", e.message); }

    // 3. Remove duplicates that would violate UNIQUE constraints
    console.log("Deduplicating potential unique constraint violations...");
    try {
        // user email duplicates
        await prisma.$executeRawUnsafe(`
            DELETE FROM "users" a USING "users" b 
            WHERE a.id > b.id AND a.email = b.email;
        `);
        await prisma.$executeRawUnsafe(`
            DELETE FROM "users" a USING "users" b 
            WHERE a.id > b.id AND a.student_id = b.student_id;
        `);
        // semesters
        await prisma.$executeRawUnsafe(`
            DELETE FROM "semesters" a USING "semesters" b 
            WHERE a.id > b.id AND a.user_id = b.user_id AND a.year = b.year AND a.type = b.type;
        `);
        // courses
        await prisma.$executeRawUnsafe(`
            DELETE FROM "courses" a USING "courses" b 
            WHERE a.id > b.id AND a.semester_id = b.semester_id AND a.code = b.code;
        `);
        // course_notes
        await prisma.$executeRawUnsafe(`
            DELETE FROM "course_notes" a USING "course_notes" b 
            WHERE a.id > b.id AND a.user_id = b.user_id AND a.db_course_id = b.db_course_id;
        `);
        // integration_tokens
        await prisma.$executeRawUnsafe(`
            DELETE FROM "integration_tokens" a USING "integration_tokens" b 
            WHERE a.id > b.id AND a.user_id = b.user_id AND a.provider = b.provider;
        `);
        // calendar events
        await prisma.$executeRawUnsafe(`
            DELETE FROM "calendar_events" a USING "calendar_events" b 
            WHERE a.id > b.id AND a.user_id = b.user_id AND a.google_event_id = b.google_event_id AND a.google_event_id IS NOT NULL;
        `);
        
        // student_profile
        await prisma.$executeRawUnsafe(`
            DELETE FROM "student_profile" a USING "student_profile" b 
            WHERE a.student_id > b.student_id AND a.user_id = b.user_id;
        `);

        console.log("✅ Deduplication finished.");
    } catch(e) { console.error("Error deduplicating:", e.message); }

    console.log("Cleanup script finished. Safe to run npx prisma db push.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
