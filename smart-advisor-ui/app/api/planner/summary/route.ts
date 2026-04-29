import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";
import { calculateSemesterGpa, getClassification, buildCourseCreditMap } from "@/lib/grading";
import fs from 'fs/promises';
import path from 'path';

// --- In-memory cache for static curriculum data ---
let curriculumCache: any = null;
let rulesCache: any = null;

async function getCurriculum() {
    if (!curriculumCache) {
        try {
            const raw = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'curriculum.json'), 'utf-8');
            curriculumCache = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to load curriculum cache", e);
            return null;
        }
    }
    return curriculumCache;
}

async function getCurriculumRules() {
    if (!rulesCache) {
        try {
            const raw = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'curriculum_rules.json'), 'utf-8');
            rulesCache = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to load rules cache", e);
            return null;
        }
    }
    return rulesCache;
}

interface UpcomingEventLike {
    id: string | number;
    type: string;
    title: string;
    start_datetime: Date;
    course_id?: number;
}

function getJordanDayKey(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman' }).format(date);
}

async function handleDailyGamificationXP(user: any, today: Date) {
    let gamification = user.gamification_profile;
    if (!gamification) {
        gamification = await prisma.gamificationProfile.create({
            data: { user_id: user.id, xp: 10, level: 1, last_activity_date: today }
        });
    } else {
        const lastDate = gamification.last_activity_date ? new Date(gamification.last_activity_date) : null;
        const lastDateStr = lastDate ? getJordanDayKey(lastDate) : "";
        const todayStr = getJordanDayKey(today);

        if (lastDateStr !== todayStr) {
            gamification = await prisma.gamificationProfile.update({
                where: { user_id: user.id },
                data: { xp: { increment: 10 }, last_activity_date: today }
            });
            await evaluateAchievements(user.id);
        }
    }
    return gamification;
}

async function handleGpaImprovement(userId: number, cgpa: number, classification: string) {
    const lastHistory = await prisma.gPAHistory.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
    });

    if (cgpa > 0 && (lastHistory === null || cgpa > lastHistory.cumulative_gpa)) {
        const diff = lastHistory ? cgpa - lastHistory.cumulative_gpa : cgpa;
        if (diff >= 0.1) {
            const xpAward = Math.floor(diff / 0.1) * 50;
            await prisma.gamificationProfile.update({
                where: { user_id: userId },
                data: { xp: { increment: xpAward } }
            });

            await prisma.gPAHistory.create({
                data: { user_id: userId, cumulative_gpa: cgpa, classification }
            });
            await evaluateAchievements(userId);
        }
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const studentId = session.user.student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined },
                    { student_id: studentId || undefined }
                ]
            },
            include: {
                studentProfile: true,
                gamification_profile: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User profile not found in database" }, { status: 404 });
        }

        const profile = user.studentProfile || await prisma.studentProfile.findFirst({
            where: {
                OR: [
                    { user_id: user.id },
                    { student_id: user.student_id || studentId }
                ]
            }
        });

        if (!profile) {
            return NextResponse.json({ 
                error: "No student profile configured",
                needs_onboarding: true,
                user: {
                    name: user.name,
                    email: user.email,
                    student_id: user.student_id || studentId
                }
            }, { status: 200 });
        }

        const JORDAN_TIMEZONE = 'Asia/Amman';
        const today = new Date();
        const jordanDateStr = today.toLocaleDateString('en-CA', { timeZone: JORDAN_TIMEZONE });
        const todayStart = new Date(`${jordanDateStr}T00:00:00.000Z`);

        // 3. Parallel fetching for independent dashboard components
        const [
            semesters,
            googleToken,
            studySessions,
            quests,
            progress,
            curriculum,
            rules
        ] = await Promise.all([
            prisma.semester.findMany({
                where: { user_id: user.id },
                include: { courses: true },
                orderBy: { year: 'desc' }
            }),
            prisma.integrationToken.findFirst({
                where: { user_id: user.id, provider: "google" }
            }),
            prisma.studySession.findMany({
                where: { user_id: user.id },
                include: { course: true },
                orderBy: { created_at: 'desc' },
                take: 100 
            }),
            prisma.quest.findMany({
                where: { user_id: user.id, status: "active" },
                include: { course: true }
            }),
            prisma.studentProgress.findUnique({
                where: { 
                    student_id_major: { 
                        student_id: profile.student_id || "", 
                        major: profile?.major || "" 
                    } 
                }
            }),
            getCurriculum(),
            getCurriculumRules()
        ]);

        const gamification = await handleDailyGamificationXP(user, todayStart);

        // 4. Determine Active Semester
        const currentSemester = semesters.find(s => {
            if (!s.start_date || !s.end_date) return false;
            return todayStart >= s.start_date && todayStart <= s.end_date;
        }) || semesters[0];

        // 5. Calculate GPA from semesters
        const allCompletedCourses = semesters.flatMap(s => s.courses.map(c => ({
            grade: c.grade_letter || "",
            credits: c.credits
        })));

        let totalQualityPoints = 0;
        let totalCredits = 0;
        for (const course of allCompletedCourses) {
            const points = calculateSemesterGpa([course]) * course.credits;
            totalQualityPoints += points;
            totalCredits += course.credits;
        }

        if (profile?.previous_gpa && profile?.previous_credits) {
            totalQualityPoints += (Number(profile.previous_gpa) * Number(profile.previous_credits));
            totalCredits += Number(profile.previous_credits);
        }

        const cgpa = totalCredits > 0 ? Math.round((totalQualityPoints / totalCredits) * 100) / 100 : 0;
        const classificationObj = getClassification(cgpa);
        const classification = classificationObj.label;

        handleGpaImprovement(user.id, cgpa, classification).catch(e => console.error("GPA logic error", e));

        // 6. Process Calendar Events & Course Exams (Memory derivation)
        const nextWeek = new Date(todayStart);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const calendarEvents = await prisma.calendarEvent.findMany({
            where: {
                user_id: user.id,
                start_datetime: { gte: todayStart }
            },
            orderBy: { start_datetime: 'asc' },
            take: 20
        });

        const derivedExams: UpcomingEventLike[] = [];
        for (const sem of semesters) {
            for (const course of sem.courses) {
                if (course.midterm_date && course.midterm_date >= todayStart) {
                    derivedExams.push({
                        id: `exam-m-${course.id}`,
                        course_id: course.id,
                        type: "Midterm",
                        title: `${course.name} - Midterm`,
                        start_datetime: course.midterm_date
                    });
                }
                if (course.final_date && course.final_date >= todayStart) {
                    derivedExams.push({
                        id: `exam-f-${course.id}`,
                        course_id: course.id,
                        type: "Final",
                        title: `${course.name} - Final`,
                        start_datetime: course.final_date
                    });
                }
            }
        }

        let combinedEvents: UpcomingEventLike[] = [...calendarEvents, ...derivedExams]
            .toSorted((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

        const nextWeekEvents = combinedEvents.filter(e => new Date(e.start_datetime) <= nextWeek);
        let upcomingEvents = nextWeekEvents.length > 0 ? nextWeekEvents.slice(0, 5) : combinedEvents.slice(0, 5);
        let upcomingEventsLabel = nextWeekEvents.length > 0 ? "Upcoming 7 Days" : "Upcoming Deadlines";

        // 7. Calculate Progress
        let completedCreditsFromTracker = 0;
        if (progress?.completed && curriculum) {
            let completedList: string[] = [];
            try {
                completedList = typeof progress.completed === 'string'
                    ? JSON.parse(progress.completed)
                    : progress.completed as string[];
            } catch { /* ok */ }

            const creditMap = buildCourseCreditMap(curriculum);
            completedCreditsFromTracker = completedList.reduce((total, code) => {
                return total + (creditMap.get(code) ?? 3);
            }, 0);
        }

        // 8. Study Trends & Neglected Courses
        const dayTrend = new Map<string, number>();
        const courseMap = new Map<number, { name: string; id: number; total: number }>();

        if (currentSemester?.courses) {
            for (const c of currentSemester.courses) {
                courseMap.set(c.id, { id: c.id, name: c.name, total: 0 });
            }
        }

        for (const session of studySessions) {
            const dateStr = session.created_at ? getJordanDayKey(new Date(session.created_at)) : '';
            if (dateStr) dayTrend.set(dateStr, (dayTrend.get(dateStr) || 0) + session.duration_minutes);
            
            if (session.course_id) {
                const existing = courseMap.get(session.course_id);
                if (existing) existing.total += session.duration_minutes;
            }
        }

        const studyTrends = Array.from(dayTrend.entries())
            .map(([date, minutes]) => ({ date, minutes }))
            .toSorted((a, b) => a.date.localeCompare(b.date))
            .slice(-7);

        const neglectedCourse = currentSemester?.courses.length 
            ? Array.from(courseMap.values()).toSorted((a, b) => a.total - b.total)[0]
            : null;

        const total_study_minutes = studySessions.reduce((acc, s) => acc + s.duration_minutes, 0);

        // 9. Response
        return NextResponse.json({
            cgpa,
            classification,
            currentSemester,
            allSemesters: semesters,
            upcomingEvents,
            upcomingEventsLabel,
            gamification,
            studyTrends,
            activeQuests: quests,
            projections: {
                distinction: (cgpa >= 4.0 ? cgpa : 4.0).toFixed(2),
                merit: (cgpa >= 3.2 ? cgpa : 3.2).toFixed(2),
                remainingCH: Math.max(0, 120 - (totalCredits || 0))
            },
            studyTips: ["Stay focused on your weakest subjects.", "Regular study intervals are better than cramming."],
            studyLogStats: {
                total_study_minutes,
                study_sessions: studySessions.slice(0, 10),
                neglected_course: neglectedCourse ? { course: { name: neglectedCourse.name }, last_studied: null } : null
            },
            neglectedCourse: neglectedCourse ? {
                id: neglectedCourse.id,
                name: neglectedCourse.name,
                total_study_minutes: neglectedCourse.total
            } : null,
            google_calendar_connected: !!googleToken,
            user: {
                name: user.name,
                email: user.email,
                student_id: profile.student_id,
                major: profile?.major || "undecided"
            }
        });
    } catch (error) {
        console.error("GET Planner Summary Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
