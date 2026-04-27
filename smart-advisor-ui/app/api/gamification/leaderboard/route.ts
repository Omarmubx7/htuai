import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    // Admin Auth Check
    const secret = request.headers.get("x-admin-secret");
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json(
            { data: null, error: "Unauthorized access" },
            { status: 401 }
        );
    }

    try {
        // Query top 100 students by XP
        const leaderboard = await prisma.gamificationProfile.findMany({
            take: 100,
            orderBy: {
                xp: "desc",
            },
            include: {
                user: {
                    select: {
                        name: true,
                        student_id: true,
                        image: true,
                    },
                },
            },
        });

        // Format data
        const formattedLeaderboard = leaderboard.map((profile) => ({
            id: profile.id,
            xp: profile.xp ?? 0,
            level: profile.level ?? 1,
            current_streak: profile.current_streak_days ?? 0,
            longest_streak: profile.longest_streak_days ?? 0,
            last_activity: profile.last_activity_date,
            student_name: profile.user?.name ?? "Unknown",
            student_id: profile.user?.student_id ?? "Unknown",
            student_image: profile.user?.image ?? null,
        }));

        return NextResponse.json(
            { data: formattedLeaderboard, error: null },
            { status: 200 }
        );
    } catch (error) {
        console.error("Leaderboard API Error:", error);
        return NextResponse.json(
            { data: null, error: "Internal server error" },
            { status: 500 }
        );
    }
}
