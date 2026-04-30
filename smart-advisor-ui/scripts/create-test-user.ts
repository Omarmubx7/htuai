import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function createTestUser() {
  try {
    const studentId = "123456";
    const password = "password123";
    const major = "electrical_engineering";
    const name = "Test Student";

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('Creating test user...');

    // Create user
    const user = await prisma.user.upsert({
      where: { student_id: studentId },
      update: {
        password_hash: passwordHash,
        name,
      },
      create: {
        student_id: studentId,
        password_hash: passwordHash,
        name,
      },
    });

    console.log(`✓ User created with ID: ${user.id}`);

    // Create profile
    const profile = await prisma.studentProfile.upsert({
      where: { student_id: studentId },
      update: { major },
      create: {
        student_id: studentId,
        major,
        previous_gpa: 3.5,
        previous_credits: 30,
        updated_at: BigInt(Math.floor(Date.now() / 1000)),
        user_id: user.id,
      },
    });

    console.log(`✓ Profile created for major: ${profile.major}`);
    console.log('\n✅ Test user created successfully!');
    console.log(`\nLogin credentials:`);
    console.log(`  Student ID: ${studentId}`);
    console.log(`  Password: ${password}`);
    console.log(`  Major: ${major}`);
    console.log(`  Database User ID: ${user.id}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
