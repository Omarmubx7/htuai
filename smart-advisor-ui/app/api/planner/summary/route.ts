import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";
import { calculateCumulativeGpaFromHistory, getClassification } from "@/lib/grading";
import { promises as fs } from 'fs';
import path from 'path';

async function handleDailyGamificationXP(user: any, today: Date) {
    let gamification = user.gamification_profile;
    if (!gamification) {
        gamification = await prisma.gamificationProfile.create({
            data: { user_id: user.id, xp: 10, level: 1, last_activity_date: today }
        });
    } else {
        const lastDate = gamification.last_activity_date ? new Date(gamification.last_activity_date) : null;
        if (lastDate === null || lastDate.getTime() < today.getTime()) {
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
    const studentId = (session.user as any).student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] },
            include: { gamification_profile: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 1. Get current local time in Jordan
        // We use Intl to get current time in Asia/Amman, then reset to start of day
        const today = new Date();
        const jordanDateStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Amman' }); // YYYY-MM-DD
        const todayStart = new Date(`${jordanDateStr}T00:00:00.000Z`); // Normalized start of day in UTC for query stability

        // 2. Summarize Gamification details & Handle Daily Open XP (+10 XP)
        const gamification = await handleDailyGamificationXP(user, todayStart);

        // 3. Calculate live CGPA
        const semesters = await prisma.semester.findMany({
            where: { user_id: user.id },
            include: { courses: true }
        });

        const allCourses = semesters.flatMap(s => s.courses.map(c => ({
            grade: c.grade_letter || "",
            credits: c.credits
        })));

        const cgpa = calculateCumulativeGpaFromHistory(allCourses);
        const classificationObj = getClassification(cgpa);
        const classification = classificationObj.label;

        // Check for improvement XP
        await handleGpaImprovement(user.id, cgpa, classification);

        // 4. Fetch active semester
        const currentSemester = await prisma.semester.findFirst({
            where: {
                user_id: user.id,
                OR: [
                    { end_date: { gte: todayStart } },
                    { end_date: null }
                ]
            },
            orderBy: { start_date: 'asc' }, 
            include: { courses: true }
        });

        // 5. Fetch upcoming calendar events within next 7 days
        const nextWeek = new Date(todayStart);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingEventsDb = await prisma.calendarEvent.findMany({
            where: {
                user_id: user.id,
                start_datetime: { gte: todayStart, lte: nextWeek }
            },
            orderBy: { start_datetime: 'asc' },
            take: 5
        });

        // Also fetch any course exam dates that haven't been synced to CalendarEvent
        const upcomingCourseExams = await prisma.course.findMany({
            where: {
                semester: { user_id: user.id },
                OR: [
                    { midterm_date: { gte: todayStart, lte: nextWeek } },
                    { final_date: { gte: todayStart, lte: nextWeek } }
                ]
            },
            include: { semester: true }
        });

        let upcomingEvents: any[] = [...upcomingEventsDb];
        for (const course of upcomingCourseExams) {
            // Check Midterm
            if (course.midterm_date && course.midterm_date >= todayStart && course.midterm_date <= nextWeek) {
                if (!upcomingEvents.some(e => e.course_id === course.id && e.type === "Midterm")) {
                    upcomingEvents.push({ 
                        id: `temp-m-${course.id}`, 
                        type: "Midterm", 
                        title: `${course.name} - Midterm`, 
                        start_datetime: course.midterm_date 
                    });
                }
            }
            // Check Final
            if (course.final_date && course.final_date >= todayStart && course.final_date <= nextWeek) {
                if (!upcomingEvents.some(e => e.course_id === course.id && e.type === "Final")) {
                    upcomingEvents.push({ 
                        id: `temp-f-${course.id}`, 
                        type: "Final", 
                        title: `${course.name} - Final`, 
                        start_datetime: course.final_date 
                    });
                }
            }
        }

        upcomingEvents = upcomingEvents.toSorted((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()).slice(0, 5);

        // 6. Fetch Major and Progress
        const profile = await prisma.studentProfile.findUnique({
            where: { student_id: user.student_id || "" }
        });

        const progress = await prisma.studentProgress.findUnique({
            where: { 
                student_id_major: { 
                    student_id: user.student_id || "", 
                    major: profile?.major || "" 
                } 
            }
        });

        let completedCreditsFromTracker = 0;
        if (progress?.completed) {
            let completedList: any[] = [];
            try {
                completedList = typeof progress.completed === 'string' ? JSON.parse(progress.completed) : progress.completed as any[];
            } catch { /* ok */ }
            completedCreditsFromTracker = Array.isArray(completedList) ? completedList.length * 3 : 0;
        }

        // 7. Calculate Study Trends (Last 7 days - Local Time Aware)
        const sevenDaysAgoQuery = new Date(todayStart);
        sevenDaysAgoQuery.setDate(sevenDaysAgoQuery.getDate() - 7);
        
        const recentSessions = await prisma.studySession.findMany({
            where: { user_id: user.id, date: { gte: sevenDaysAgoQuery } },
            select: { duration_minutes: true, date: true }
        });

        const studyTrends = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(todayStart);
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Amman' }); 
            
            const mins = recentSessions
                .filter(s => {
                    const sessionDate = s.date ? new Date(s.date) : null;
                    if (!sessionDate) return false;
                    const sDateStr = sessionDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Amman' });
                    return sDateStr === dateStr;
                })
                .reduce((acc, s) => acc + s.duration_minutes, 0);
            return { date: dateStr, minutes: mins };
        }).reverse();

        // 8. Identify Most Neglected Course
        const twoWeeks = new Date(todayStart);
        twoWeeks.setDate(twoWeeks.getDate() + 14);
        
        const upcomingExamCourses = await prisma.course.findMany({
            where: {
                semester: { user_id: user.id },
                OR: [
                    { midterm_date: { gte: todayStart, lte: twoWeeks } },
                    { final_date: { gte: todayStart, lte: twoWeeks } }
                ]
            },
            select: {
                id: true,
                code: true,
                name: true,
                midterm_date: true,
                final_date: true,
                study_sessions: {
                    select: {
                        duration_minutes: true,
                        created_at: true
                    }
                }
            }
        });

        let neglectedCourse = null;
        if (upcomingExamCourses.length > 0) {
            neglectedCourse = upcomingExamCourses.sort((a, b) => {
                const aMins = a.study_sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
                const bMins = b.study_sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
                return aMins - bMins;
            })[0];
        }

        const fullRecentSessions = await prisma.studySession.findMany({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' },
            take: 20,
            include: { course: true }
        });

        const allSessions = await prisma.studySession.aggregate({
            where: { user_id: user.id },
            _sum: { duration_minutes: true }
        });
        const total_study_minutes = allSessions._sum.duration_minutes || 0;

        const activeQuests = await prisma.quest.findMany({
            where: { user_id: user.id, status: 'active' },
            take: 2
        });

        // 9. Calculate Real GPA Projections
        const rulesRaw = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'curriculum_rules.json'), 'utf-8');
        const rulesJson = JSON.parse(rulesRaw);
        
        let TOTAL_DEGREE_CH = 135;
        for (const type in rulesJson.degree_types) {
            if (rulesJson.degree_types[type].major_keys.includes(profile?.major || "")) {
                TOTAL_DEGREE_CH = rulesJson.degree_types[type].total_credits;
                break;
            }
        }

        const currentCompletedCH = (profile?.previous_credits || 0) + completedCreditsFromTracker;
        const remainingCH = Math.max(0, TOTAL_DEGREE_CH - currentCompletedCH);
        const currentTotalPoints = (cgpa * currentCompletedCH);
        
        const projectedDistinction = remainingCH > 0 
            ? (currentTotalPoints + (4.0 * remainingCH)) / TOTAL_DEGREE_CH 
            : cgpa;
            
        const projectedMerit = remainingCH > 0 
            ? (currentTotalPoints + (3.2 * remainingCH)) / TOTAL_DEGREE_CH 
            : cgpa;

        // 10. Generate Dynamic Study Tips
        const dynamicTips = [];
        if (neglectedCourse) {
            dynamicTips.push({
                title: "Spaced Repetition",
                text: `You haven't studied ${neglectedCourse.name} much. Review your notes for it today to boost retention.`,
                icon: "clock",
                color: "orange"
            });
        }
        if (upcomingEvents.length > 0) {
            dynamicTips.push({
                title: "Active Recall",
                text: `You have ${upcomingEvents.length} upcoming deadlines. Test your knowledge without looking at your notes!`,
                icon: "target",
                color: "emerald"
            });
        }
        if (dynamicTips.length < 2) {
            dynamicTips.push({
                title: "Pomodoro Technique",
                text: "Try studying in 25-minute bursts with 5-minute breaks to maintain peak focus.",
                icon: "flame",
                color: "rose"
            });
        }

        const googleToken = await prisma.integrationToken.findFirst({
            where: { user_id: user.id, provider: "google_calendar" }
        });

        return NextResponse.json({
            cgpa,
            classification,
            currentSemester,
            upcomingEvents,
            gamification,
            studyTrends,
            activeQuests,
            projections: {
                distinction: projectedDistinction.toFixed(2),
                merit: projectedMerit.toFixed(2),
                remainingCH
            },
            studyTips: dynamicTips,
            studyLogStats: {
                total_study_minutes,
                study_sessions: fullRecentSessions,
                neglected_course: neglectedCourse ? {
                    course: { name: neglectedCourse.name },
                    last_studied: neglectedCourse.study_sessions.toSorted((x: any, y: any) => {
                        const tx = x.created_at ? new Date(x.created_at).getTime() : 0;
                        const ty = y.created_at ? new Date(y.created_at).getTime() : 0;
                        return ty - tx;
                    })[0]?.created_at || null
                } : null
            },
            neglectedCourse: neglectedCourse ? {
                id: neglectedCourse.id,
                code: neglectedCourse.code,
                name: neglectedCourse.name,
                midterm_date: neglectedCourse.midterm_date,
                final_date: neglectedCourse.final_date,
                total_study_minutes: neglectedCourse.study_sessions.reduce((acc: number, s: any) => acc + s.duration_minutes, 0)
            } : null,
            google_calendar_connected: !!googleToken,
            google_preferences: googleToken?.metadata || {},
            previous_academic_history: profile ? {
                gpa: profile.previous_gpa,
                credits: profile.previous_credits
            } : null,
            user: {
                name: user.name,
                email: user.email,
                student_id: user.student_id,
                role: (user as Record<string, unknown>).role || "student",
                image: user.image,
                major: profile?.major || "undecided"
            }
        });
    } catch (error) {
        console.error("GET Planner Summary Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
