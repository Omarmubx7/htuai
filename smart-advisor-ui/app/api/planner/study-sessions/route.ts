import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";

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
        const { course_id, duration_minutes, type, notes, date } = body;

        if (!duration_minutes || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

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

        const whereClause: Parameters<typeof prisma.studySession.findMany>[0]["where"] = { user_id: user.id };
        if (courseIdStr) {
            whereClause.course_id = Number(courseIdStr);
        }

        const sessions = await prisma.studySession.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            take: 50
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error("GET StudySession Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
