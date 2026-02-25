import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";
import { calculateCumulativeGpaFromHistory, getClassification } from "@/lib/grading";

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

        // 2. Summarize Gamification details & Handle Daily Open XP (+10 XP)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const gamification = await handleDailyGamificationXP(user, today);

        // 3. Calculate live CGPA and Handle GPA Improvement XP
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

        // Check for improvement XP (Spec: +50 XP per 0.1 increase)
        await handleGpaImprovement(user.id, cgpa, classification);

        // 2. Fetch active semester (most recent that has not ended yet)
        const todayForComparison = new Date();
        todayForComparison.setHours(0, 0, 0, 0);

        let currentSemester = await prisma.semester.findFirst({
            where: {
                user_id: user.id,
                end_date: { gte: todayForComparison }
            },
            orderBy: { start_date: 'asc' }, // The earliest one that hasn't ended
            include: { courses: true }
        });

        // If no active semester found, just don't return one, or return null
        // The dashboard handles currentSemester being null gracefully

        // 3. Fetch upcoming calendar events within next 7 days
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingEventsDb = await prisma.calendarEvent.findMany({
            where: {
                user_id: user.id,
                start_datetime: { gte: new Date(), lte: nextWeek }
            },
            orderBy: { start_datetime: 'asc' },
            take: 5
        });

        // Also fetch any course exam dates that haven't been synced to CalendarEvent
        const upcomingCourseExams = await prisma.course.findMany({
            where: {
                semester: { user_id: user.id },
                OR: [
                    { midterm_date: { gte: new Date(), lte: nextWeek } },
                    { final_date: { gte: new Date(), lte: nextWeek } }
                ]
            },
            include: { semester: true }
        });

        let upcomingEvents: any[] = [...upcomingEventsDb];
        for (const course of upcomingCourseExams) {
            if (course.midterm_date && course.midterm_date >= new Date() && course.midterm_date <= nextWeek) {
                if (!upcomingEvents.some(e => e.course_id === course.id && e.type === "Midterm")) {
                    upcomingEvents.push({ id: `temp-m-${course.id}`, type: "Midterm", title: `${course.name} - Midterm`, start_datetime: course.midterm_date });
                }
            }
            if (course.final_date && course.final_date >= new Date() && course.final_date <= nextWeek) {
                if (!upcomingEvents.some(e => e.course_id === course.id && e.type === "Final")) {
                    upcomingEvents.push({ id: `temp-f-${course.id}`, type: "Final", title: `${course.name} - Final`, start_datetime: course.final_date });
                }
            }
        }

        upcomingEvents = upcomingEvents.toSorted((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()).slice(0, 5);


        // 5. Fetch Major from StudentProfile
        const profile = await prisma.studentProfile.findUnique({
            where: { student_id: user.student_id || "" }
        });

        // 6. Check for integration status and preferences
        const googleToken = await prisma.integrationToken.findFirst({
            where: { user_id: user.id, provider: "google_calendar" }
        });

        // 7. Calculate Study Trends (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentSessions = await prisma.studySession.findMany({
            where: { user_id: user.id, date: { gte: sevenDaysAgo } },
            select: { duration_minutes: true, date: true }
        });

        // Group by day for a simple chart
        const studyTrends = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const mins = recentSessions
                .filter(s => s.date?.toISOString().split('T')[0] === dateStr)
                .reduce((acc, s) => acc + s.duration_minutes, 0);
            return { date: dateStr, minutes: mins };
        }).reverse();

        // 8. Identify Most Neglected Course
        // Course with exam in next 14 days and lowest study minutes
        const twoWeeks = new Date();
        twoWeeks.setDate(twoWeeks.getDate() + 14);
        const upcomingExamCourses = await prisma.course.findMany({
            where: {
                semester: { user_id: user.id },
                OR: [
                    { midterm_date: { gte: new Date(), lte: twoWeeks } },
                    { final_date: { gte: new Date(), lte: twoWeeks } }
                ]
            } as any,
            include: { study_sessions: true }
        }) as any[];

        let neglectedCourse = null;
        if (upcomingExamCourses.length > 0) {
            neglectedCourse = upcomingExamCourses.toSorted((a: any, b: any) => {
                const aMins = a.study_sessions.reduce((acc: number, s: any) => acc + s.duration_minutes, 0);
                const bMins = b.study_sessions.reduce((acc: number, s: any) => acc + s.duration_minutes, 0);
                return aMins - bMins;
            })[0];
        }

        // Fetch full session details for history log
        const fullRecentSessions = await prisma.studySession.findMany({
            where: { user_id: user.id },
            orderBy: { date: 'desc' },
            take: 20,
            include: { course: true }
        });

        return NextResponse.json({
            cgpa,
            classification,
            currentSemester,
            upcomingEvents,
            gamification,
            studyTrends,
            studyLogStats: {
                study_sessions: fullRecentSessions,
                neglected_course: neglectedCourse ? {
                    course: { name: neglectedCourse.name },
                    last_studied: neglectedCourse.study_sessions.toSorted((x: any, y: any) => y.date - x.date)[0]?.date || null
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
                role: (user as any).role || "student",
                image: user.image,
                major: profile?.major || "undecided"
            }
        });
    } catch (error) {
        console.error("GET Planner Summary Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
