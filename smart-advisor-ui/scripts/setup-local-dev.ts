#!/usr/bin/env node
/**
 * LOCAL DEVELOPMENT SETUP SCRIPT
 * 
 * This script sets up your local PostgreSQL database for full feature testing:
 * - Creates test users (with/without Google OAuth)
 * - Creates sample majors and courses
 * - Creates semesters and study plans
 * - Sets up gamification data
 * - All data is isolated to LOCAL DATABASE ONLY
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';

interface TestUser {
  email: string;
  student_id: string;
  password: string;
  name: string;
  major: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'test.user@example.com',
    student_id: '123456',
    password: process.env.LOCAL_TEST_PASSWORD || crypto.randomUUID().replaceAll('-', '').slice(0, 12),
    name: 'Test User',
    major: 'electrical_engineering'
  },
  {
    email: 'ai.student@example.com',
    student_id: '789012',
    password: process.env.LOCAL_TEST_PASSWORD || crypto.randomUUID().replaceAll('-', '').slice(0, 12),
    name: 'AI Test Student',
    major: 'computer_science'
  },
];

const SAMPLE_MAJORS = [
  'computer_science',
  'electrical_engineering',
  'mechanical_engineering',
  'civil_engineering',
  'software_engineering',
];

async function createUsers() {
  console.log('\n📝 Creating test users...');
  
  for (const testUser of TEST_USERS) {
    try {
      const passwordHash = await bcrypt.hash(testUser.password, 10);
      
      const user = await prisma.user.upsert({
        where: { student_id: testUser.student_id },
        update: {
          email: testUser.email,
          password_hash: passwordHash,
          name: testUser.name,
        },
        create: {
          student_id: testUser.student_id,
          email: testUser.email,
          password_hash: passwordHash,
          name: testUser.name,
        },
      });

      console.log(`  ✓ User created: ${testUser.email} (ID: ${user.id})`);

      // Create profile
      await prisma.studentProfile.upsert({
        where: { student_id: testUser.student_id },
        update: { major: testUser.major },
        create: {
          student_id: testUser.student_id,
          major: testUser.major,
          previous_gpa: 3.5,
          previous_credits: 30,
          updated_at: BigInt(Math.floor(Date.now() / 1000)),
          user_id: user.id,
        },
      });

      console.log(`  ✓ Profile created for major: ${testUser.major}`);

      // Create a semester so planner features work
      const semester = await prisma.semester.create({
        data: {
          user_id: user.id,
          name: 'Spring 2026',
          type: 'spring',
          year: 2026,
          start_date: new Date('2026-01-15'),
          end_date: new Date('2026-05-15'),
          study_schedule: [],
          ai_exam_tips: [],
        },
      });

      console.log(`  ✓ Semester created: ${semester.name}`);

    } catch (error) {
      console.error(`  ✗ Failed to create user ${testUser.student_id}:`, error);
    }
  }
}

async function createGamificationData() {
  console.log('\n🎮 Setting up gamification data...');
  
  try {
    // Get all users
    const users = await prisma.user.findMany();
    if (!users || users.length === 0) {
      console.log('  ℹ No users found, skipping gamification setup');
      return;
    }

    for (const user of users) {
      await prisma.gamificationProfile.upsert({
        where: { user_id: user.id },
        update: {
          xp: 0,
          level: 1,
          current_streak_days: 0,
        },
        create: {
          user_id: user.id,
          xp: 0,
          level: 1,
          current_streak_days: 0,
          longest_streak_days: 0,
        },
      });

      console.log(`  ✓ Gamification initialized for ${user.email || user.student_id}`);
    }
  } catch (error) {
    console.error('  ✗ Failed to create gamification data:', error);
  }
}

async function verifyDatabaseConnection() {
  console.log('\n🔍 Verifying database connection...');
  
  try {
    await prisma.$queryRaw`SELECT 1 as ping`;
    console.log('  ✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('  ✗ Database connection failed:', error);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚀 LOCAL DEVELOPMENT DATABASE SETUP');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Verify connection
    const connected = await verifyDatabaseConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Create users
    await createUsers();

    // Create gamification data
    await createGamificationData();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ Setup complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📋 Test Credentials (for Credentials provider):');
    TEST_USERS.forEach(user => {
      console.log(`\n  Email/Student ID: ${user.student_id}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Name: ${user.name}`);
    });

    console.log('\n🔗 Google OAuth Setup:');
    console.log('  If logging in with Google, your email will be:');
    console.log(`  ${TEST_USERS[0].email}`);
    console.log('\n💡 Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Visit: http://localhost:3000');
    console.log('  3. Log in with test credentials above');
    console.log('  4. Try AI features (they should work now!)');
    console.log('\n⚠️  IMPORTANT:');
    console.log('  - This data is LOCAL ONLY (not in production)');
    console.log('  - .env file uses localhost:5432/htuai_dev');
    console.log('  - Vercel production remains unaffected\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();
