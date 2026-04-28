/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function buildCourseCreditMap(curriculum) {
  const map = new Map();

  const addList = (courses) => {
    if (!Array.isArray(courses)) return;
    for (const course of courses) {
      if (!course || typeof course !== 'object') continue;
      const code = typeof course.code === 'string' ? course.code : null;
      if (!code) continue;
      const credits = typeof course.ch === 'number'
        ? course.ch
        : (typeof course.credits === 'number' ? course.credits : 3);
      map.set(code, credits);
    }
  };

  if (!curriculum || typeof curriculum !== 'object') return map;

  if (curriculum.shared && typeof curriculum.shared === 'object') {
    for (const list of Object.values(curriculum.shared)) addList(list);
  }

  if (curriculum.majors && typeof curriculum.majors === 'object') {
    for (const majorValue of Object.values(curriculum.majors)) {
      if (!majorValue || typeof majorValue !== 'object') continue;
      for (const list of Object.values(majorValue)) addList(list);
    }
  }

  return map;
}

function parseCompleted(completed) {
  try {
    const parsed = typeof completed === 'string' ? JSON.parse(completed) : completed;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCompletedCode(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.code === 'string') return entry.code;
  return null;
}

async function run() {
  const curriculumPath = path.join(process.cwd(), 'public', 'data', 'curriculum.json');
  const curriculumRaw = fs.readFileSync(curriculumPath, 'utf-8');
  const courseCreditMap = buildCourseCreditMap(JSON.parse(curriculumRaw));

  const profiles = await prisma.studentProfile.findMany({
    where: {
      previous_credits: { gt: 200 }
    },
    select: {
      student_id: true,
      major: true,
      previous_credits: true
    }
  });

  if (profiles.length === 0) {
    console.log('No malformed previous_credits rows found (> 200).');
    return;
  }

  let updated = 0;

  for (const profile of profiles) {
    const progressRows = await prisma.studentProgress.findMany({
      where: { student_id: profile.student_id },
      orderBy: { updated_at: 'desc' },
      select: { major: true, completed: true }
    });

    if (progressRows.length === 0) {
      console.log(`Skipping ${profile.student_id}: no student_progress rows found.`);
      continue;
    }

    const preferredProgress = progressRows.find((row) => row.major === profile.major) || progressRows[0];
    const completedEntries = parseCompleted(preferredProgress.completed);

    const computedCredits = completedEntries.reduce((sum, entry) => {
      const code = getCompletedCode(entry);
      if (!code) return sum;
      return sum + (courseCreditMap.get(code) || 3);
    }, 0);

    await prisma.studentProfile.update({
      where: { student_id: profile.student_id },
      data: { previous_credits: computedCredits }
    });

    updated += 1;
    console.log(
      `Updated ${profile.student_id}: ${profile.previous_credits} -> ${computedCredits} (major=${preferredProgress.major})`
    );
  }

  console.log(`Done. Updated ${updated}/${profiles.length} malformed rows.`);
}

run()
  .catch((err) => {
    console.error('Failed to run credit cleanup migration.', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
