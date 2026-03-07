import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const studentId = session.user.student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] },
            include: { gamification_profile: true, user_badges: { include: { badge: true } } }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        let profile = user.gamification_profile;

        // If no profile exists, create a default one
        if (!profile) {
            profile = await prisma.gamificationProfile.create({
                data: {
                    user_id: user.id,
                    xp: 10,
                    level: 1,
                    current_streak_days: 0,
                    longest_streak_days: 0,
                    last_activity_date: new Date()
                }
            });
        }

        // Safeguard: Ensure XP is never negative
        if (profile.xp < 0) {
            profile = await prisma.gamificationProfile.update({
                where: { user_id: user.id },
                data: { xp: 0 }
            });
        }

        return NextResponse.json({
            profile,
            badges: user.user_badges.map(ub => ub.badge)
        });

    } catch (error) {
        console.error("GET Gamification Profile Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
