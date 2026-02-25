const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking duplicates...");
    const res1 = await prisma.$queryRawUnsafe('SELECT user_id, count(*) FROM student_profile GROUP BY user_id HAVING count(*) > 1;');
    console.log('student_profile dupes:', res1);
    
    // Check old schema gamification mapping if table exists
    try {
        const res2 = await prisma.$queryRawUnsafe('SELECT user_id, count(*) FROM gamification_profiles GROUP BY user_id HAVING count(*) > 1;');
        console.log('gamification dupes:', res2);
    } catch(e) {}
    
    const res3 = await prisma.$queryRawUnsafe('SELECT student_id, count(*) FROM users WHERE student_id IS NOT NULL GROUP BY student_id HAVING count(*) > 1;');
    console.log('users student_id dupes:', res3);
    
    const res4 = await prisma.$queryRawUnsafe('SELECT email, count(*) FROM users WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1;');
    console.log('users email dupes:', res4);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
