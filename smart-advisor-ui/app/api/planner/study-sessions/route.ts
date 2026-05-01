import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";
import { createAdminLog } from "@/lib/database";
import { validateInput, validationErrorResponse } from "@/lib/validation";

const studySessionSchema = {
    course_id: { type: "number" as const, required: false },
    duration_minutes: { type: "number" as const, required: true, min: 1, max: 1440 },
    type: { type: "string" as const, required: true, enum: ["study", "assignment", "exam_prep", "project", "reading", "other"] },
    notes: { type: "string" as const, required: false, max: 2000 },
    date: { type: "string" as const, required: false }
};

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const studentId = session.user.student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const body = await req.json();
        const validation = validateInput(body, studySessionSchema);
        
        if (!validation.isValid) {
            return validationErrorResponse(validation.errors);
        }

        const { course_id, duration_minutes, type, notes, date } = body;

        const newSession = await prisma.studySession.create({
            data: {
                user_id: user.id,
                course_id: course_id ? Number(course_id) : null,
                duration_minutes: Number(duration_minutes),
                type,
                notes: notes || null,
                date: date ? new Date(date) : new Date()
            }
        });

        // Update gamification XP (Spec: 1 XP per 1 minute)
        const earnedXP = Math.floor(duration_minutes);

        // Fetch current gamification profile to calculate streak
        const currentProfile = await prisma.gamificationProfile.findUnique({
            where: { user_id: user.id }
        });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let newCurrentStreak = 1;
        let newLongestStreak = 1;

        if (currentProfile && currentProfile.last_activity_date) {
            const lastActivity = new Date(currentProfile.last_activity_date);
            const lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());

            const diffTime = Math.abs(today.getTime() - lastActivityDay.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Same day, streak remains the same
                newCurrentStreak = currentProfile.current_streak_days || 1;
            } else if (diffDays === 1) {
                // Next day, increment streak
                newCurrentStreak = (currentProfile.current_streak_days || 0) + 1;
            } else {
                // Streak broken, reset to 1
                newCurrentStreak = 1;
            }

            newLongestStreak = Math.max(currentProfile.longest_streak_days || 1, newCurrentStreak);
        }

        const gamificationUpdate = await prisma.gamificationProfile.upsert({
            where: { user_id: user.id },
            update: {
                xp: { increment: earnedXP },
                last_activity_date: now,
                current_streak_days: newCurrentStreak,
                longest_streak_days: newLongestStreak
            },
            create: {
                user_id: user.id,
                xp: earnedXP,
                level: 1,
                current_streak_days: 1,
                longest_streak_days: 1,
                last_activity_date: now
            }
        });

        // Trigger dynamic achievements evaluation
        await evaluateAchievements(user.id, Number(duration_minutes));

        createAdminLog({
            type: 'study_session',
            message: `Student ${user.student_id || user.email} logged ${duration_minutes}min study session (${type})`,
            details: { student_id: user.student_id, email: user.email, duration_minutes, type, course_id: course_id || null, earned_xp: earnedXP, new_total_xp: gamificationUpdate.xp, streak: newCurrentStreak },
            event_kind: 'study_session',
            target_id: user.student_id || String(user.id),
        }).catch(() => {});

        return NextResponse.json({ session: newSession, earnedXP, newTotalXP: gamificationUpdate.xp });
    } catch (error) {
        console.error("POST StudySession Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const studentId = session.user.student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const searchParams = req.nextUrl.searchParams;
        const courseIdStr = searchParams.get("courseId");

        const sessions = await prisma.studySession.findMany({
            where: courseIdStr ? { user_id: user.id, course_id: Number(courseIdStr) } : { user_id: user.id },
            orderBy: { date: 'desc' },
            take: 50
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error("GET StudySession Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
